from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
import asyncio
from datetime import datetime, timezone, timedelta
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import bcrypt
import jwt as pyjwt
import re
import json as json_module

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_client = AsyncIOMotorClient(mongo_url)
db = db_client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'agenciaos-jwt-secret-key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI(title="AgênciaOS API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============= AUTH UTILITIES =============

def create_jwt_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request):
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    if not token:
        token = request.cookies.get("token")
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


# ============= REQUEST MODELS =============

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class SessionRequest(BaseModel):
    session_id: str

class LeadCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    billing_type: str = "BOLETO"
    value: float = 0
    due_date: Optional[str] = None
    source: str = "manual"
    status: str = "novo"
    score: int = 50
    notes: Optional[str] = None

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    billing_type: Optional[str] = None
    value: Optional[float] = None
    due_date: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    score: Optional[int] = None
    notes: Optional[str] = None

class StageCreate(BaseModel):
    name: str
    color: str = "#3B82F6"
    order: int = 0
    is_won_stage: bool = False
    is_meeting_stage: bool = False
    pipeline_type: str = "default"

class DealCreate(BaseModel):
    title: str
    value: float = 0
    stage_id: str
    lead_id: Optional[str] = None
    contact_name: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    billing_type: str = "BOLETO"
    due_date: Optional[str] = None
    meeting_date: Optional[str] = None
    meeting_email: Optional[str] = None
    probability: int = 50
    notes: Optional[str] = None
    pipeline_type: str = "default"
    instagram_handle: Optional[str] = None

class DealUpdate(BaseModel):
    title: Optional[str] = None
    value: Optional[float] = None
    stage_id: Optional[str] = None
    contact_name: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    billing_type: Optional[str] = None
    due_date: Optional[str] = None
    meeting_date: Optional[str] = None
    meeting_email: Optional[str] = None
    probability: Optional[int] = None
    notes: Optional[str] = None

class StageWebhookUpdate(BaseModel):
    webhook_url: str = ""
    webhook_enabled: bool = True
    is_won_stage: bool = False
    is_meeting_stage: bool = False

class PipelineWebhookFireRequest(BaseModel):
    stage_id: str

class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    status: str = "ativo"
    monthly_value: float = 0
    billing_type: str = "BOLETO"
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    status: Optional[str] = None
    monthly_value: Optional[float] = None
    billing_type: Optional[str] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None

class WebhookSettings(BaseModel):
    webhook_url: str
    enabled: bool = True

class AIRequest(BaseModel):
    prompt: str
    context: Optional[Dict[str, Any]] = None

class AddToPipelineRequest(BaseModel):
    stage_id: str

class StageUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

class StageReorderItem(BaseModel):
    stage_id: str
    order: int

class StageReorderRequest(BaseModel):
    stages: List[StageReorderItem]

class OperationalCardUpdate(BaseModel):
    meta_ads: Optional[bool] = None
    google_ads: Optional[bool] = None
    auto_reports: Optional[bool] = None
    alerts: Optional[bool] = None

class CarouselWebhookSettings(BaseModel):
    webhook_url: str
    enabled: bool = True

class CarouselRequest(BaseModel):
    client_id: str

class ApiKeysUpdate(BaseModel):
    perplexity_key: Optional[str] = None
    openai_key: Optional[str] = None
    anthropic_key: Optional[str] = None
    gemini_key: Optional[str] = None
    groq_key: Optional[str] = None

class CarouselNewsRequest(BaseModel):
    client_id: str
    period_days: int = 7
    llm_provider: str = "perplexity"

class CarouselThemesRequest(BaseModel):
    client_id: str
    news_context: str
    llm_provider: str = "openai"

class CarouselCopyRequest(BaseModel):
    client_id: str
    chosen_theme: str
    news_context: str
    llm_provider: str = "openai"

class CarouselDesignRequest(BaseModel):
    client_id: str
    copy_content: str
    chosen_theme: str
    llm_provider: str = "openai"
    template_image_b64: Optional[str] = None
    template_image_type: Optional[str] = None  # "image/jpeg", "image/png", "image/webp"
    change_request: Optional[str] = None
    current_html: Optional[str] = None

class CarouselSaveRequest(BaseModel):
    client_id: str
    client_name: str
    theme: str
    html_content: str
    llm_provider: str


# ---- Collaborators ----

class CollaboratorCreate(BaseModel):
    name: str
    email: Optional[str] = None
    role: str = "analyst"
    avatar_url: Optional[str] = None

class CollaboratorUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None

class ClientCollaboratorAssign(BaseModel):
    collaborator_id: str
    role: str = "responsible"

# ---- Operational Tasks ----

class TaskCreate(BaseModel):
    title: str
    status: str = "TO_DO"
    priority: str = "NORMAL"
    assignee_id: Optional[str] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    estimated_minutes: Optional[int] = None
    is_recurring: bool = False
    recurring_rule: Optional[str] = None
    parent_task_id: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[str] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    estimated_minutes: Optional[int] = None
    is_recurring: Optional[bool] = None
    recurring_rule: Optional[str] = None
    position: Optional[int] = None

class TaskReorderBatchItem(BaseModel):
    task_id: str
    position: int

class TaskBatchReorderRequest(BaseModel):
    tasks: List[TaskReorderBatchItem]

class TimeLogCreate(BaseModel):
    minutes: int
    note: Optional[str] = None

class TaskCommentCreate(BaseModel):
    content: str
    author_name: Optional[str] = None


# ============= AUTH ENDPOINTS =============

@api_router.post("/auth/register")
async def register(body: RegisterRequest, response: Response):
    existing = await db.users.find_one({"email": body.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    password_hash = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    user_id = f"user_{uuid.uuid4().hex[:12]}"

    user_doc = {
        "user_id": user_id,
        "name": body.name,
        "email": body.email,
        "password_hash": password_hash,
        "picture": None,
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)

    token = create_jwt_token(user_id, body.email)
    response.set_cookie("token", token, httponly=True, samesite="none", secure=True, max_age=7 * 24 * 3600, path="/")
    user_data = {k: v for k, v in user_doc.items() if k not in ["_id", "password_hash"]}
    return {"token": token, "user": user_data}


@api_router.post("/auth/login")
async def login(body: LoginRequest, response: Response):
    user = await db.users.find_one({"email": body.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    if not bcrypt.checkpw(body.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    token = create_jwt_token(user["user_id"], user["email"])
    response.set_cookie("token", token, httponly=True, samesite="none", secure=True, max_age=7 * 24 * 3600, path="/")
    user_data = {k: v for k, v in user.items() if k not in ["_id", "password_hash"]}
    return {"token": token, "user": user_data}


@api_router.post("/auth/session")
async def google_auth_session(body: SessionRequest, response: Response):
    """Exchange Emergent Auth session_id for our JWT token"""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": body.session_id},
                timeout=10.0,
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Sessão inválida")
            data = resp.json()
    except httpx.RequestError as e:
        logger.error(f"Error calling Emergent Auth: {e}")
        raise HTTPException(status_code=500, detail="Erro ao verificar sessão Google")

    email = data["email"]
    name = data.get("name", email.split("@")[0])
    picture = data.get("picture")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture, "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        user_data = {k: v for k, v in existing.items() if k not in ["_id", "password_hash"]}
        user_data.update({"name": name, "picture": picture})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "name": name,
            "email": email,
            "picture": picture,
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user_doc)
        user_data = {k: v for k, v in user_doc.items() if k != "_id"}

    token = create_jwt_token(user_id, email)
    response.set_cookie("token", token, httponly=True, samesite="none", secure=True, max_age=7 * 24 * 3600, path="/")
    return {"token": token, "user": user_data}


@api_router.get("/auth/me")
async def me(current_user: dict = Depends(get_current_user)):
    return {k: v for k, v in current_user.items() if k != "password_hash"}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("token", path="/")
    return {"message": "Logout realizado com sucesso"}


# ============= LEADS ENDPOINTS =============

@api_router.get("/leads")
async def list_leads(current_user: dict = Depends(get_current_user)):
    leads = await db.leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return leads


@api_router.post("/leads")
async def create_lead(body: LeadCreate, current_user: dict = Depends(get_current_user)):
    lead_id = f"lead_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    lead_doc = {
        "lead_id": lead_id,
        **body.model_dump(),
        "user_id": current_user["user_id"],
        "created_at": now,
        "updated_at": now,
    }
    await db.leads.insert_one(lead_doc)
    return {k: v for k, v in lead_doc.items() if k != "_id"}


@api_router.get("/leads/{lead_id}")
async def get_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    return lead


@api_router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, body: LeadUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.leads.update_one({"lead_id": lead_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    return await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})


@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.leads.delete_one({"lead_id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    return {"message": "Lead removido com sucesso"}


# ============= PIPELINE ENDPOINTS =============

@api_router.get("/pipeline/stages")
async def list_stages(type: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    pipeline_type = type or "default"
    if pipeline_type == "default":
        q = {"$or": [{"pipeline_type": "default"}, {"pipeline_type": {"$exists": False}}]}
    else:
        q = {"pipeline_type": pipeline_type}
    stages = await db.pipeline_stages.find(q, {"_id": 0}).sort("order", 1).to_list(50)
    return stages


@api_router.post("/pipeline/stages")
async def create_stage(body: StageCreate, current_user: dict = Depends(get_current_user)):
    stage_id = f"stage_{uuid.uuid4().hex[:10]}"
    stage_doc = {
        "stage_id": stage_id,
        **body.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.pipeline_stages.insert_one(stage_doc)
    return {k: v for k, v in stage_doc.items() if k != "_id"}


@api_router.get("/pipeline/deals")
async def list_deals(pipeline_type: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    pt = pipeline_type or "default"
    not_deleted = {"$or": [{"deleted_at": {"$exists": False}}, {"deleted_at": None}]}
    if pt == "default":
        pt_q = {"$or": [{"pipeline_type": "default"}, {"pipeline_type": {"$exists": False}}]}
    else:
        pt_q = {"pipeline_type": pt}
    filter_q = {"$and": [not_deleted, pt_q]}
    deals = await db.deals.find(filter_q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return deals


@api_router.post("/pipeline/deals")
async def create_deal(body: DealCreate, current_user: dict = Depends(get_current_user)):
    deal_id = f"deal_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    deal_doc = {
        "deal_id": deal_id,
        **body.model_dump(),
        "user_id": current_user["user_id"],
        "created_at": now,
        "updated_at": now,
    }
    await db.deals.insert_one(deal_doc)
    return {k: v for k, v in deal_doc.items() if k != "_id"}


@api_router.put("/pipeline/deals/{deal_id}")
async def update_deal(deal_id: str, body: DealUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.deals.update_one({"deal_id": deal_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Deal não encontrado")
    deal = await db.deals.find_one({"deal_id": deal_id}, {"_id": 0})

    # Auto-create client when deal reaches a "won" stage
    auto_client_id = None
    if "stage_id" in update_data:
        target_stage = await db.pipeline_stages.find_one({"stage_id": update_data["stage_id"]}, {"_id": 0})
        if target_stage and target_stage.get("is_won_stage"):
            auto_client_id = await auto_create_client_from_deal(deal, current_user)

    response = dict(deal)
    if auto_client_id:
        response["_client_auto_created"] = True
        response["_client_id"] = auto_client_id
    return response


async def auto_create_client_from_deal(deal: dict, current_user: dict) -> Optional[str]:
    """Create a Client record from a won deal. Skips if already created for this deal."""
    existing = await db.clients.find_one({"deal_id": deal["deal_id"]}, {"_id": 0})
    if existing:
        return existing["client_id"]  # Already created

    client_id = f"client_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    client_doc = {
        "client_id": client_id,
        "deal_id": deal["deal_id"],           # Link for dedup
        "name": deal.get("title") or deal.get("contact_name") or "",
        "email": deal.get("email") or "",
        "phone": deal.get("phone") or "",
        "company": deal.get("company") or "",
        "cpf_cnpj": deal.get("cpf_cnpj") or "",
        "status": "ativo",
        "monthly_value": deal.get("value") or 0,
        "billing_type": deal.get("billing_type") or "BOLETO",
        "start_date": today,
        "due_date": deal.get("due_date"),
        "notes": deal.get("notes") or "",
        "user_id": current_user["user_id"],
        "created_at": now,
        "updated_at": now,
    }
    await db.clients.insert_one(client_doc)

    # Auto-create operational card
    op_card_id = f"opcard_{uuid.uuid4().hex[:10]}"
    await db.operational_cards.insert_one({
        "op_card_id": op_card_id,
        "client_id": client_id,
        "meta_ads": False,
        "google_ads": False,
        "auto_reports": False,
        "alerts": False,
        "created_at": now,
        "updated_at": now,
    })

    # Fire N8N webhook (same as manual client creation)
    await send_n8n_webhook(client_doc)
    logger.info(f"Auto-created client {client_id} from won deal {deal['deal_id']}")
    return client_id


@api_router.delete("/pipeline/deals/{deal_id}")
async def delete_deal(deal_id: str, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    result = await db.deals.update_one(
        {"deal_id": deal_id},
        {"$set": {"deleted_at": now, "updated_at": now}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Deal não encontrado")
    return {"deleted_at": now, "deal_id": deal_id}


# ============= WEBHOOK HELPER =============

async def send_n8n_webhook(client_doc: dict):
    """Fire N8N webhook when a new client is created, if configured and enabled."""
    try:
        settings = await db.settings.find_one({"setting_id": "webhook_n8n"}, {"_id": 0})
        if not settings or not settings.get("enabled") or not settings.get("webhook_url"):
            return
        # Compute due_date: use client value or default to 1st day of next month
        if client_doc.get("due_date"):
            due_date_str = client_doc["due_date"]
        else:
            now = datetime.now(timezone.utc)
            month = now.month % 12 + 1
            year = now.year + (1 if now.month == 12 else 0)
            due_date_str = f"{year}-{month:02d}-01"

        payload = {
            "name": client_doc.get("name", ""),
            "cpfCnpj": client_doc.get("cpf_cnpj", ""),
            "email": client_doc.get("email", ""),
            "mobilePhone": client_doc.get("phone", ""),
            "billingType": client_doc.get("billing_type", "BOLETO"),
            "value": client_doc.get("monthly_value", 0),
            "dueDate": due_date_str,
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(settings["webhook_url"], json=payload, timeout=10.0)
            logger.info(f"N8N webhook dispatched → {resp.status_code}")
    except Exception as exc:
        logger.error(f"N8N webhook error: {exc}")  # never breaks client creation


async def call_n8n_with_retry(url: str, payload: dict, retries: int = 3, timeout: float = 30.0):
    """Call N8N webhook with exponential backoff retry."""
    last_error = "desconhecido"
    for attempt in range(retries):
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json=payload, timeout=timeout)
                if resp.status_code < 500:
                    try:
                        return resp.json()
                    except Exception:
                        return {"raw_response": resp.text, "status_code": resp.status_code}
            last_error = f"HTTP {resp.status_code}"
        except httpx.TimeoutException:
            last_error = "timeout (30s)"
        except httpx.RequestError as exc:
            last_error = str(exc)
        if attempt < retries - 1:
            await asyncio.sleep((attempt + 1) * 1.5)
    raise HTTPException(
        status_code=504,
        detail=f"N8N não respondeu após {retries} tentativas. Erro: {last_error}",
    )


# ============= CLIENTS ENDPOINTS =============

@api_router.get("/clients")
async def list_clients(current_user: dict = Depends(get_current_user)):
    clients = await db.clients.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return clients


@api_router.post("/clients")
async def create_client(body: ClientCreate, current_user: dict = Depends(get_current_user)):
    client_id = f"client_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    client_doc = {
        "client_id": client_id,
        **body.model_dump(),
        "user_id": current_user["user_id"],
        "created_at": now,
        "updated_at": now,
    }
    await db.clients.insert_one(client_doc)
    # Auto-create operational card (atomic within same request)
    op_card_id = f"opcard_{uuid.uuid4().hex[:10]}"
    await db.operational_cards.insert_one({
        "op_card_id": op_card_id,
        "client_id": client_id,
        "meta_ads": False,
        "google_ads": False,
        "auto_reports": False,
        "alerts": False,
        "created_at": now,
        "updated_at": now,
    })
    result = {k: v for k, v in client_doc.items() if k != "_id"}
    await send_n8n_webhook(client_doc)
    return result


@api_router.get("/clients/{client_id}")
async def get_client(client_id: str, current_user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return client


@api_router.put("/clients/{client_id}")
async def update_client(client_id: str, body: ClientUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.clients.update_one({"client_id": client_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return await db.clients.find_one({"client_id": client_id}, {"_id": 0})


@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.clients.delete_one({"client_id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return {"message": "Cliente removido com sucesso"}


# ============= WEBHOOK SETTINGS ENDPOINTS =============

@api_router.get("/settings/webhook")
async def get_webhook_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"setting_id": "webhook_n8n"}, {"_id": 0})
    if not settings:
        return {"webhook_url": "", "enabled": False}
    return {"webhook_url": settings.get("webhook_url", ""), "enabled": settings.get("enabled", False)}


@api_router.put("/settings/webhook")
async def save_webhook_settings(body: WebhookSettings, current_user: dict = Depends(get_current_user)):
    await db.settings.update_one(
        {"setting_id": "webhook_n8n"},
        {
            "$set": {
                "setting_id": "webhook_n8n",
                "webhook_url": body.webhook_url,
                "enabled": body.enabled,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True,
    )
    return {"message": "Webhook salvo com sucesso", "webhook_url": body.webhook_url, "enabled": body.enabled}


@api_router.post("/settings/webhook/test")
async def test_webhook(current_user: dict = Depends(get_current_user)):
    """Send a test payload to the configured N8N webhook."""
    settings = await db.settings.find_one({"setting_id": "webhook_n8n"}, {"_id": 0})
    if not settings or not settings.get("webhook_url"):
        raise HTTPException(status_code=400, detail="Webhook não configurado. Salve a URL primeiro.")

    now = datetime.now(timezone.utc)
    month = now.month % 12 + 1
    year = now.year + (1 if now.month == 12 else 0)
    test_payload = {
        "name": "Cliente Teste AgênciaOS",
        "cpfCnpj": "00000000000000",
        "email": "teste@agenciaos.com",
        "mobilePhone": "11999999999",
        "billingType": "BOLETO",
        "value": 500.00,
        "dueDate": f"{year}-{month:02d}-01",
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(settings["webhook_url"], json=test_payload, timeout=10.0)
            return {"status": "success", "status_code": resp.status_code, "message": f"Payload enviado com sucesso (HTTP {resp.status_code})"}
    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="Timeout: o N8N não respondeu em 10s")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro ao enviar: {str(exc)}")


# ============= FEATURE 1: LEAD → PIPELINE =============

@api_router.post("/leads/{lead_id}/pipeline")
async def add_lead_to_pipeline(lead_id: str, body: AddToPipelineRequest, current_user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")

    # Check if already in active pipeline
    active_filter = {
        "lead_id": lead_id,
        "$or": [{"deleted_at": {"$exists": False}}, {"deleted_at": None}],
    }
    existing = await db.deals.find_one(active_filter, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Lead já está em um pipeline ativo")

    stage = await db.pipeline_stages.find_one({"stage_id": body.stage_id}, {"_id": 0})
    if not stage:
        raise HTTPException(status_code=404, detail="Etapa não encontrada")

    deal_id = f"deal_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    deal_doc = {
        "deal_id": deal_id,
        "title": lead["name"],
        "value": lead.get("value", 0),
        "stage_id": body.stage_id,
        "lead_id": lead_id,
        "contact_name": lead["name"],
        "company": lead.get("company", ""),
        "email": lead.get("email", ""),
        "phone": lead.get("phone", ""),
        "cpf_cnpj": lead.get("cpf_cnpj", ""),
        "billing_type": lead.get("billing_type", "BOLETO"),
        "due_date": lead.get("due_date"),
        "probability": 50,
        "notes": lead.get("notes", ""),
        "user_id": current_user["user_id"],
        "created_at": now,
        "updated_at": now,
    }
    await db.deals.insert_one(deal_doc)
    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {"status": "em_atendimento", "updated_at": now}},
    )
    result = {k: v for k, v in deal_doc.items() if k != "_id"}
    result["stage"] = stage
    return result


# ============= FEATURE 2: STAGE MANAGEMENT =============

@api_router.patch("/pipeline/stages/reorder")
async def reorder_stages(body: StageReorderRequest, current_user: dict = Depends(get_current_user)):
    for item in body.stages:
        await db.pipeline_stages.update_one(
            {"stage_id": item.stage_id},
            {"$set": {"order": item.order}},
        )
    return {"message": "Etapas reordenadas com sucesso"}


@api_router.patch("/pipeline/stages/{stage_id}")
async def update_stage(stage_id: str, body: StageUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    result = await db.pipeline_stages.update_one({"stage_id": stage_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Etapa não encontrada")
    return await db.pipeline_stages.find_one({"stage_id": stage_id}, {"_id": 0})


# ============= PIPELINE WEBHOOK PER STAGE =============

@api_router.put("/pipeline/stages/{stage_id}/webhook")
async def save_stage_webhook(stage_id: str, body: StageWebhookUpdate, current_user: dict = Depends(get_current_user)):
    """Save webhook URL, enable/disable flag, and is_won_stage for a specific pipeline stage."""
    result = await db.pipeline_stages.update_one(
        {"stage_id": stage_id},
        {"$set": {
            "webhook_url": body.webhook_url,
            "webhook_enabled": body.webhook_enabled,
            "is_won_stage": body.is_won_stage,
            "is_meeting_stage": body.is_meeting_stage,
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Etapa não encontrada")
    return await db.pipeline_stages.find_one({"stage_id": stage_id}, {"_id": 0})


@api_router.post("/pipeline/deals/{deal_id}/fire-webhook")
async def fire_deal_webhook(deal_id: str, body: PipelineWebhookFireRequest, current_user: dict = Depends(get_current_user)):
    """Fire the configured N8N webhook for the target stage when a deal is moved there."""
    deal = await db.deals.find_one({"deal_id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal não encontrado")

    stage = await db.pipeline_stages.find_one({"stage_id": body.stage_id}, {"_id": 0})
    if not stage:
        raise HTTPException(status_code=404, detail="Etapa não encontrada")

    webhook_url = stage.get("webhook_url", "")
    webhook_enabled = stage.get("webhook_enabled", False)

    if not webhook_url or not webhook_enabled:
        return {"status": "skipped", "reason": "Webhook não configurado ou desativado para esta etapa"}

    # Build due_date
    if deal.get("due_date"):
        due_date_str = deal["due_date"]
    else:
        now_dt = datetime.now(timezone.utc)
        next_month = now_dt.month % 12 + 1
        year = now_dt.year + (1 if now_dt.month == 12 else 0)
        due_date_str = f"{year}-{next_month:02d}-01"

    payload = {
        "name": deal.get("title", ""),
        "cpfCnpj": deal.get("cpf_cnpj", "") or "",
        "email": deal.get("email", "") or "",
        "mobilePhone": deal.get("phone", "") or "",
        "billingType": deal.get("billing_type", "BOLETO") or "BOLETO",
        "value": deal.get("value", 0),
        "dueDate": due_date_str,
    }

    log_id = f"wlog_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()

    try:
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            resp = await http_client.post(
                webhook_url, json=payload,
                headers={"Content-Type": "application/json"},
            )
            success = resp.status_code < 400
            await db.deal_webhook_logs.insert_one({
                "log_id": log_id, "deal_id": deal_id,
                "stage_id": body.stage_id, "stage_name": stage.get("name", ""),
                "status": "success" if success else "error",
                "status_code": resp.status_code,
                "payload": payload, "response": resp.text[:500],
                "fired_at": now,
            })
            return {
                "status": "success" if success else "error",
                "status_code": resp.status_code,
                "log_id": log_id,
            }
    except Exception as exc:
        await db.deal_webhook_logs.insert_one({
            "log_id": log_id, "deal_id": deal_id,
            "stage_id": body.stage_id, "stage_name": stage.get("name", ""),
            "status": "error", "status_code": 0,
            "payload": payload, "response": str(exc)[:500],
            "fired_at": now,
        })
        return {"status": "error", "error": str(exc)[:200], "log_id": log_id}


@api_router.get("/pipeline/deals/{deal_id}/webhook-logs")
async def get_deal_webhook_logs(deal_id: str, current_user: dict = Depends(get_current_user)):
    """Return the webhook dispatch history for a specific deal."""
    logs = await db.deal_webhook_logs.find({"deal_id": deal_id}, {"_id": 0}).sort("fired_at", -1).to_list(50)
    return logs


# ============= FEATURE 3: OPERATIONAL CARDS =============

@api_router.get("/operational")
async def list_operational(current_user: dict = Depends(get_current_user)):
    pipeline_q = [
        {"$project": {"_id": 0}},
        {"$lookup": {
            "from": "clients",
            "localField": "client_id",
            "foreignField": "client_id",
            "as": "client_list",
        }},
        {"$addFields": {
            "client": {"$ifNull": [{"$first": "$client_list"}, {}]}
        }},
        {"$project": {
            "client_list": 0,
            "client._id": 0,
        }},
    ]
    result = await db.operational_cards.aggregate(pipeline_q).to_list(500)
    return result


@api_router.patch("/operational/{client_id}")
async def update_operational(client_id: str, body: OperationalCardUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.operational_cards.update_one(
        {"client_id": client_id},
        {"$set": update_data},
        upsert=True,
    )
    return await db.operational_cards.find_one({"client_id": client_id}, {"_id": 0})


# ============= FEATURE 4: CAROUSEL GENERATION =============

@api_router.get("/settings/carousel-webhook")
async def get_carousel_webhook(current_user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"setting_id": "webhook_carousel"}, {"_id": 0})
    if not settings:
        return {"webhook_url": "", "enabled": False}
    return {"webhook_url": settings.get("webhook_url", ""), "enabled": settings.get("enabled", False)}


@api_router.put("/settings/carousel-webhook")
async def save_carousel_webhook(body: CarouselWebhookSettings, current_user: dict = Depends(get_current_user)):
    await db.settings.update_one(
        {"setting_id": "webhook_carousel"},
        {"$set": {
            "setting_id": "webhook_carousel",
            "webhook_url": body.webhook_url,
            "enabled": body.enabled,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"message": "Webhook de carrossel salvo", "webhook_url": body.webhook_url, "enabled": body.enabled}


@api_router.post("/content/carousel/generate")
async def generate_carousel(body: CarouselRequest, current_user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"client_id": body.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    settings = await db.settings.find_one({"setting_id": "webhook_carousel"}, {"_id": 0})
    if not settings or not settings.get("webhook_url"):
        raise HTTPException(
            status_code=400,
            detail="Webhook de carrossel não configurado. Acesse Configurações > N8N > Webhook de Carrossel.",
        )
    if not settings.get("enabled"):
        raise HTTPException(status_code=400, detail="Webhook de carrossel está desativado nas configurações.")

    if not client.get("notes", "").strip():
        raise HTTPException(
            status_code=422,
            detail="Cliente sem notas cadastradas. Adicione informações do nicho nas Notas do cliente.",
        )

    job_id = f"job_{uuid.uuid4().hex[:12]}"
    payload = {
        "jobId": job_id,
        "clientId": client["client_id"],
        "clientName": client["name"],
        "niche": client.get("company", ""),
        "notes": client.get("notes", ""),
        "email": client.get("email", ""),
        "requestedAt": datetime.now(timezone.utc).isoformat(),
    }

    log_id = f"log_{uuid.uuid4().hex[:10]}"
    await db.content_generation_logs.insert_one({
        "log_id": log_id,
        "job_id": job_id,
        "client_id": body.client_id,
        "status": "pending",
        "payload": payload,
        "response": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    try:
        result = await call_n8n_with_retry(settings["webhook_url"], payload)
        await db.content_generation_logs.update_one(
            {"job_id": job_id},
            {"$set": {"status": "success", "response": result}},
        )
        return {"job_id": job_id, "status": "success", "data": result}
    except HTTPException as exc:
        await db.content_generation_logs.update_one(
            {"job_id": job_id},
            {"$set": {"status": "failed", "response": {"error": exc.detail}}},
        )
        raise


# ============= COLLABORATORS =============

@api_router.get("/collaborators")
async def list_collaborators(role: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    q: Dict[str, Any] = {"is_active": True}
    if role:
        q["role"] = role
    collaborators = await db.collaborators.find(q, {"_id": 0}).sort("name", 1).to_list(200)
    return collaborators


@api_router.post("/collaborators")
async def create_collaborator(body: CollaboratorCreate, current_user: dict = Depends(get_current_user)):
    collab_id = f"collab_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    doc = {"collaborator_id": collab_id, **body.model_dump(), "is_active": True, "created_at": now}
    await db.collaborators.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api_router.patch("/collaborators/{collaborator_id}")
async def update_collaborator(collaborator_id: str, body: CollaboratorUpdate, current_user: dict = Depends(get_current_user)):
    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    result = await db.collaborators.update_one({"collaborator_id": collaborator_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Colaborador não encontrado")
    return await db.collaborators.find_one({"collaborator_id": collaborator_id}, {"_id": 0})


@api_router.delete("/collaborators/{collaborator_id}")
async def deactivate_collaborator(collaborator_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.collaborators.update_one(
        {"collaborator_id": collaborator_id}, {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Colaborador não encontrado")
    return {"message": "Colaborador desativado"}


# ============= CLIENT-COLLABORATOR ASSIGNMENTS =============

@api_router.get("/clients/{client_id}/collaborators")
async def get_client_collaborators(client_id: str, current_user: dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"client_id": client_id}},
        {"$project": {"_id": 0}},
        {"$lookup": {"from": "collaborators", "localField": "collaborator_id", "foreignField": "collaborator_id", "as": "collab_list"}},
        {"$addFields": {"collaborator": {"$ifNull": [{"$first": "$collab_list"}, {}]}}},
        {"$project": {"collab_list": 0, "collaborator._id": 0}},
    ]
    return await db.client_collaborators.aggregate(pipeline).to_list(50)


@api_router.post("/clients/{client_id}/collaborators")
async def assign_collaborator_to_client(client_id: str, body: ClientCollaboratorAssign, current_user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    collab = await db.collaborators.find_one({"collaborator_id": body.collaborator_id, "is_active": True}, {"_id": 0})
    if not collab:
        raise HTTPException(status_code=404, detail="Colaborador não encontrado")
    now = datetime.now(timezone.utc).isoformat()
    await db.client_collaborators.update_one(
        {"client_id": client_id, "collaborator_id": body.collaborator_id},
        {"$set": {"client_id": client_id, "collaborator_id": body.collaborator_id, "role": body.role, "assigned_at": now}},
        upsert=True,
    )
    return {"client_id": client_id, "collaborator_id": body.collaborator_id, "role": body.role, "collaborator": collab}


@api_router.delete("/clients/{client_id}/collaborators/{collaborator_id}")
async def remove_collaborator_from_client(client_id: str, collaborator_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.client_collaborators.delete_one({"client_id": client_id, "collaborator_id": collaborator_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Atribuição não encontrada")
    return {"message": "Atribuição removida"}


# ============= OPERATIONAL TASKS =============

def _active_task_filter():
    return {"$or": [{"deleted_at": {"$exists": False}}, {"deleted_at": None}]}


@api_router.post("/clients/{client_id}/tasks/apply-template")
async def apply_task_template(client_id: str, current_user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    existing = await db.operational_tasks.count_documents({"client_id": client_id, **_active_task_filter()})
    if existing > 0:
        raise HTTPException(status_code=400, detail="Este cliente já possui tarefas. Limpe antes de aplicar o template.")

    DEFAULT_TEMPLATE = [
        {"title": "Criar grupo de Whatsapp com o Cliente", "priority": "URGENT", "estimated_minutes": 2},
        {"title": "Dados para Contrato", "priority": "URGENT", "estimated_minutes": 5},
        {"title": "Elaborar e Assinar Contrato", "priority": "HIGH", "estimated_minutes": 10},
        {"title": "Cadastrar Asaas", "priority": "NORMAL", "estimated_minutes": 5},
        {"title": "Agendar Cobranças", "priority": "NORMAL", "estimated_minutes": 7},
        {"title": "Briefing", "priority": "HIGH", "estimated_minutes": 40},
        {"title": "Estruturação de Campanhas", "priority": "HIGH", "estimated_minutes": 80},
        {"title": "Validação de Campanhas", "priority": "HIGH", "estimated_minutes": 8},
        {"title": "Enviar Campanhas para Aprovação", "priority": "HIGH", "estimated_minutes": 8},
        {"title": "Follow-up", "priority": "NORMAL", "estimated_minutes": 15},
        {"title": "Otimizações", "priority": "HIGH", "estimated_minutes": 30},
        {"title": "Otimizações/Verificações semanais", "priority": "HIGH", "estimated_minutes": 20, "is_recurring": True, "recurring_rule": "weekly"},
        {"title": "Envio de Mensagem no grupo para Relatório", "priority": "NORMAL", "estimated_minutes": 2, "is_recurring": True, "recurring_rule": "monthly"},
        {"title": "DIÁRIO", "priority": "NORMAL", "estimated_minutes": 20, "is_recurring": True, "recurring_rule": "daily"},
    ]
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for i, tmpl in enumerate(DEFAULT_TEMPLATE):
        task_id = f"task_{uuid.uuid4().hex[:10]}"
        docs.append({
            "task_id": task_id, "client_id": client_id, "parent_task_id": None,
            "title": tmpl["title"], "status": "TO_DO", "priority": tmpl["priority"],
            "assignee_id": None, "start_date": None, "due_date": None,
            "estimated_minutes": tmpl.get("estimated_minutes"), "tracked_minutes": 0,
            "position": i, "is_recurring": tmpl.get("is_recurring", False),
            "recurring_rule": tmpl.get("recurring_rule"), "comment_count": 0,
            "deleted_at": None, "created_at": now, "updated_at": now,
        })
    await db.operational_tasks.insert_many(docs)
    return [{k: v for k, v in d.items() if k != "_id"} for d in docs]


@api_router.get("/clients/{client_id}/tasks")
async def list_client_tasks(
    client_id: str,
    status: Optional[str] = None,
    assignee_id: Optional[str] = None,
    priority: Optional[str] = None,
    parent_task_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    client = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    q_parts: List[Dict] = [{"client_id": client_id}, _active_task_filter()]
    if parent_task_id is not None:
        q_parts.append({"parent_task_id": parent_task_id})
    else:
        q_parts.append({"$or": [{"parent_task_id": {"$exists": False}}, {"parent_task_id": None}]})
    if status:
        q_parts.append({"status": status})
    if assignee_id:
        q_parts.append({"assignee_id": assignee_id})
    if priority:
        q_parts.append({"priority": priority})

    tasks = await db.operational_tasks.find({"$and": q_parts}, {"_id": 0}).sort("position", 1).to_list(500)
    if not tasks:
        return []

    assignee_ids = list({t["assignee_id"] for t in tasks if t.get("assignee_id")})
    collab_map: Dict[str, Any] = {}
    if assignee_ids:
        collabs = await db.collaborators.find({"collaborator_id": {"$in": assignee_ids}}, {"_id": 0}).to_list(100)
        collab_map = {c["collaborator_id"]: c for c in collabs}

    task_ids = [t["task_id"] for t in tasks]
    subtask_pipeline = [
        {"$match": {"parent_task_id": {"$in": task_ids}, **_active_task_filter()}},
        {"$group": {"_id": "$parent_task_id", "count": {"$sum": 1}, "completed": {"$sum": {"$cond": [{"$eq": ["$status", "DONE"]}, 1, 0]}}}},
    ]
    subtask_agg = await db.operational_tasks.aggregate(subtask_pipeline).to_list(1000)
    subtask_map = {s["_id"]: s for s in subtask_agg}

    for task in tasks:
        task["assignee"] = collab_map.get(task.get("assignee_id"))
        sc = subtask_map.get(task["task_id"], {"count": 0, "completed": 0})
        task["subtask_count"] = sc["count"]
        task["completed_subtasks"] = sc["completed"]

    return tasks


@api_router.post("/clients/{client_id}/tasks")
async def create_client_task(client_id: str, body: TaskCreate, current_user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    last_task = await db.operational_tasks.find_one(
        {"client_id": client_id, "parent_task_id": body.parent_task_id},
        {"_id": 0, "position": 1}, sort=[("position", -1)],
    )
    position = (last_task["position"] + 1) if last_task else 0
    task_id = f"task_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "task_id": task_id, "client_id": client_id, "parent_task_id": body.parent_task_id,
        "title": body.title, "status": body.status, "priority": body.priority,
        "assignee_id": body.assignee_id, "start_date": body.start_date, "due_date": body.due_date,
        "estimated_minutes": body.estimated_minutes, "tracked_minutes": 0, "position": position,
        "is_recurring": body.is_recurring, "recurring_rule": body.recurring_rule,
        "comment_count": 0, "deleted_at": None, "created_at": now, "updated_at": now,
    }
    await db.operational_tasks.insert_one(doc)
    result = {k: v for k, v in doc.items() if k != "_id"}
    result["assignee"] = None
    result["subtask_count"] = 0
    result["completed_subtasks"] = 0
    return result


# ============= TASK MANAGEMENT =============

@api_router.patch("/tasks/reorder")
async def reorder_tasks(body: TaskBatchReorderRequest, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    for item in body.tasks:
        await db.operational_tasks.update_one(
            {"task_id": item.task_id},
            {"$set": {"position": item.position, "updated_at": now}},
        )
    return {"message": "Tarefas reordenadas com sucesso"}


@api_router.patch("/tasks/{task_id}")
async def update_task(task_id: str, body: TaskUpdate, current_user: dict = Depends(get_current_user)):
    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    now = datetime.now(timezone.utc).isoformat()
    update_data["updated_at"] = now
    if update_data.get("status") == "DONE":
        update_data["completed_at"] = now
    elif "status" in update_data and update_data["status"] != "DONE":
        update_data["completed_at"] = None
    result = await db.operational_tasks.update_one(
        {"task_id": task_id, **_active_task_filter()}, {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    task = await db.operational_tasks.find_one({"task_id": task_id}, {"_id": 0})
    if task:
        task["assignee"] = (
            await db.collaborators.find_one({"collaborator_id": task["assignee_id"]}, {"_id": 0})
            if task.get("assignee_id") else None
        )
    return task


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    result = await db.operational_tasks.update_one(
        {"task_id": task_id}, {"$set": {"deleted_at": now, "updated_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    return {"deleted_at": now, "task_id": task_id}


@api_router.post("/tasks/{task_id}/time")
async def log_time(task_id: str, body: TimeLogCreate, current_user: dict = Depends(get_current_user)):
    task = await db.operational_tasks.find_one({"task_id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    if body.minutes <= 0:
        raise HTTPException(status_code=400, detail="Minutos deve ser positivo")
    log_id = f"timelog_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    await db.task_time_logs.insert_one({
        "log_id": log_id, "task_id": task_id, "collaborator_id": None,
        "minutes": body.minutes, "note": body.note, "logged_at": now,
    })
    new_tracked = (task.get("tracked_minutes") or 0) + body.minutes
    await db.operational_tasks.update_one(
        {"task_id": task_id}, {"$set": {"tracked_minutes": new_tracked, "updated_at": now}}
    )
    return {"log_id": log_id, "task_id": task_id, "minutes": body.minutes, "tracked_minutes": new_tracked}


@api_router.get("/tasks/{task_id}/comments")
async def list_comments(task_id: str, current_user: dict = Depends(get_current_user)):
    return await db.task_comments.find({"task_id": task_id}, {"_id": 0}).sort("created_at", 1).to_list(200)


@api_router.post("/tasks/{task_id}/comments")
async def add_comment(task_id: str, body: TaskCommentCreate, current_user: dict = Depends(get_current_user)):
    task = await db.operational_tasks.find_one({"task_id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    comment_id = f"comment_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "comment_id": comment_id, "task_id": task_id,
        "author_id": current_user["user_id"],
        "author_name": body.author_name or current_user.get("name", "Usuário"),
        "content": body.content, "created_at": now,
    }
    await db.task_comments.insert_one(doc)
    await db.operational_tasks.update_one({"task_id": task_id}, {"$inc": {"comment_count": 1}})
    return {k: v for k, v in doc.items() if k != "_id"}


# ============= OPERATIONAL SUMMARY =============

@api_router.get("/operational/summary")
async def get_operational_summary(manager_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    clients = await db.clients.find({"status": "ativo"}, {"_id": 0}).to_list(500)
    if not clients:
        return []
    client_ids = [c["client_id"] for c in clients]
    now_iso = datetime.now(timezone.utc).isoformat()

    task_pipeline = [
        {"$match": {"client_id": {"$in": client_ids}, **_active_task_filter()}},
        {"$group": {
            "_id": "$client_id",
            "total": {"$sum": 1},
            "done": {"$sum": {"$cond": [{"$eq": ["$status", "DONE"]}, 1, 0]}},
            "todo": {"$sum": {"$cond": [{"$eq": ["$status", "TO_DO"]}, 1, 0]}},
            "in_progress": {"$sum": {"$cond": [{"$eq": ["$status", "IN_PROGRESS"]}, 1, 0]}},
            "overdue": {"$sum": {"$cond": [
                {"$and": [
                    {"$not": [{"$in": ["$status", ["DONE", "CANCELLED"]]}]},
                    {"$ne": ["$due_date", None]}, {"$lt": ["$due_date", now_iso]},
                ]}, 1, 0,
            ]}},
        }},
    ]
    task_agg = await db.operational_tasks.aggregate(task_pipeline).to_list(1000)
    task_map = {t["_id"]: t for t in task_agg}

    cc_pipeline = [
        {"$match": {"client_id": {"$in": client_ids}, "role": "responsible"}},
        {"$project": {"_id": 0}},
        {"$lookup": {"from": "collaborators", "localField": "collaborator_id", "foreignField": "collaborator_id", "as": "collab_list"}},
        {"$addFields": {"collaborator": {"$ifNull": [{"$first": "$collab_list"}, None]}}},
        {"$project": {"collab_list": 0, "collaborator._id": 0}},
    ]
    cc_data = await db.client_collaborators.aggregate(cc_pipeline).to_list(1000)
    cc_map = {cc["client_id"]: cc for cc in cc_data}

    op_cards = await db.operational_cards.find({"client_id": {"$in": client_ids}}, {"_id": 0}).to_list(500)
    op_map = {o["client_id"]: o for o in op_cards}

    result = []
    for client in clients:
        cid = client["client_id"]
        cc = cc_map.get(cid)
        responsible = cc["collaborator"] if cc and cc.get("collaborator") else None
        if manager_id:
            if not responsible or responsible.get("collaborator_id") != manager_id:
                continue
        task_info = task_map.get(cid, {"total": 0, "done": 0, "todo": 0, "in_progress": 0, "overdue": 0})
        op = op_map.get(cid, {})
        result.append({
            "client": client, "responsible_collaborator": responsible,
            "task_summary": {
                "total": task_info.get("total", 0), "done": task_info.get("done", 0),
                "todo": task_info.get("todo", 0), "in_progress": task_info.get("in_progress", 0),
                "overdue": task_info.get("overdue", 0),
            },
            "services": {
                "meta_ads": op.get("meta_ads", False), "google_ads": op.get("google_ads", False),
                "auto_reports": op.get("auto_reports", False), "alerts": op.get("alerts", False),
            },
        })
    return result


# ============= DASHBOARD ENDPOINTS =============

def _days_ago(dt_str: str, now: datetime) -> int:
    """Return how many days ago a ISO datetime string was."""
    if not dt_str:
        return 0
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return max(0, (now - dt).days)
    except Exception:
        return 0


@api_router.get("/dashboard/mrr-trend")
async def get_mrr_trend(current_user: dict = Depends(get_current_user)):
    """Return cumulative MRR snapshot for each of the last 6 months."""
    now = datetime.now(timezone.utc)
    clients = await db.clients.find(
        {"status": "ativo"},
        {"_id": 0, "monthly_value": 1, "created_at": 1},
    ).to_list(500)

    def _month_end_iso(year: int, month: int) -> str:
        if month == 12:
            return datetime(year + 1, 1, 1, tzinfo=timezone.utc).isoformat()
        return datetime(year, month + 1, 1, tzinfo=timezone.utc).isoformat()

    trend = []
    for months_ago in range(5, -1, -1):
        total = now.year * 12 + now.month - 1 - months_ago
        year, month = total // 12, total % 12 + 1
        end_iso = _month_end_iso(year, month)
        label = datetime(year, month, 1).strftime("%b/%y")
        mrr_snap = sum(
            c.get("monthly_value", 0) for c in clients
            if c.get("created_at", "") < end_iso
        )
        trend.append({"month": label, "mrr": round(mrr_snap, 2)})
    return trend


@api_router.get("/dashboard/kpis")
async def get_dashboard_kpis(period: int = 30, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    period_start_iso = (now - timedelta(days=period)).isoformat()
    seven_days_ago_iso = (now - timedelta(days=7)).isoformat()
    three_days_ago_iso = (now - timedelta(days=3)).isoformat()
    thirty_days_ago_iso = (now - timedelta(days=30)).isoformat()
    today_str = now.strftime("%Y-%m-%d")

    # Stage metadata
    stages = await db.pipeline_stages.find({}, {"_id": 0}).sort("order", 1).to_list(20)
    won_stage_id = next((s["stage_id"] for s in stages if "ganho" in s["name"].lower()), "stage_ganho01")
    lost_stage_id = next(
        (s["stage_id"] for s in stages if "perdido" in s["name"].lower() or "perdi" in s["name"].lower()),
        "stage_perdi01",
    )
    proposta_stage_id = next(
        (s["stage_id"] for s in stages if "propos" in s["name"].lower()), "stage_propos01"
    )

    active_deal_q = {"$or": [{"deleted_at": {"$exists": False}}, {"deleted_at": None}]}

    # Parallel data fetch
    (
        total_leads,
        leads_this_month,
        active_clients_count,
        all_deals,
        recent_leads,
        leads_source_agg,
        mrr_agg,
        overdue_tasks_count,
        churn_risk_count,
    ) = await asyncio.gather(
        db.leads.count_documents({}),
        db.leads.count_documents({"created_at": {"$gte": period_start_iso}}),
        db.clients.count_documents({"status": "ativo"}),
        db.deals.find(active_deal_q, {"_id": 0}).to_list(500),
        db.leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(8),
        db.leads.aggregate([
            {"$group": {"_id": "$source", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]).to_list(10),
        db.clients.aggregate([
            {"$match": {"status": "ativo"}},
            {"$group": {"_id": None, "total": {"$sum": "$monthly_value"}}},
        ]).to_list(1),
        db.operational_tasks.count_documents({
            "status": {"$nin": ["DONE"]},
            "due_date": {"$lt": today_str, "$ne": None},
            "$or": [{"deleted_at": {"$exists": False}}, {"deleted_at": None}],
        }),
        db.clients.count_documents({
            "status": "ativo",
            "$or": [
                {"updated_at": {"$lt": thirty_days_ago_iso}},
                {"updated_at": {"$exists": False}},
            ],
        }),
    )

    mrr = mrr_agg[0]["total"] if mrr_agg else 0
    ticket_avg = round(mrr / active_clients_count) if active_clients_count > 0 else 0

    pipeline_deals = [d for d in all_deals if d.get("stage_id") not in [won_stage_id, lost_stage_id]]
    won_deals_list = [d for d in all_deals if d.get("stage_id") == won_stage_id]
    total_deals = len(all_deals)

    pipeline_value = sum(d.get("value", 0) for d in pipeline_deals)
    predicted_revenue = sum(d.get("value", 0) * (d.get("probability", 50) / 100) for d in pipeline_deals)
    conversion_rate = round((len(won_deals_list) / total_deals * 100) if total_deals > 0 else 0, 1)

    # Stale deals: no update in 7+ days, not won/lost
    stale_raw = sorted(
        [d for d in pipeline_deals if (d.get("updated_at") or d.get("created_at", "")) < seven_days_ago_iso],
        key=lambda d: d.get("updated_at") or d.get("created_at", ""),
    )
    stale_deals = [
        {
            "deal_id": d["deal_id"],
            "title": d["title"],
            "company": d.get("company", ""),
            "stage": next((s["name"] for s in stages if s["stage_id"] == d.get("stage_id")), "?"),
            "days_stale": _days_ago(d.get("updated_at") or d.get("created_at"), now),
        }
        for d in stale_raw[:5]
    ]

    # Proposals without response: in proposta stage, not updated in 3+ days
    proposals_raw = sorted(
        [
            d for d in pipeline_deals
            if d.get("stage_id") == proposta_stage_id
            and (d.get("updated_at") or d.get("created_at", "")) < three_days_ago_iso
        ],
        key=lambda d: d.get("updated_at") or d.get("created_at", ""),
    )
    proposals_no_response = [
        {
            "deal_id": d["deal_id"],
            "title": d["title"],
            "company": d.get("company", ""),
            "days_waiting": _days_ago(d.get("updated_at") or d.get("created_at"), now),
        }
        for d in proposals_raw[:5]
    ]

    # Average closing days
    avg_closing_days = 0
    if won_deals_list:
        times = []
        for d in won_deals_list:
            try:
                c = datetime.fromisoformat(d["created_at"].replace("Z", "+00:00"))
                u = datetime.fromisoformat(d["updated_at"].replace("Z", "+00:00"))
                if c.tzinfo is None:
                    c = c.replace(tzinfo=timezone.utc)
                if u.tzinfo is None:
                    u = u.replace(tzinfo=timezone.utc)
                times.append(max(0, (u - c).days))
            except Exception:
                pass
        if times:
            avg_closing_days = round(sum(times) / len(times))

    # Deals by stage with funnel conversion rates (exclude lost)
    deals_by_stage = []
    for stage in stages:
        if stage["stage_id"] == lost_stage_id:
            continue
        stage_deals = [d for d in all_deals if d.get("stage_id") == stage["stage_id"]]
        deals_by_stage.append({
            "stage": stage["name"],
            "stage_id": stage["stage_id"],
            "count": len(stage_deals),
            "value": sum(d.get("value", 0) for d in stage_deals),
            "color": stage.get("color", "#3B82F6"),
        })
    for i, entry in enumerate(deals_by_stage):
        if i == 0:
            entry["conv_from_prev"] = 100
        else:
            prev = deals_by_stage[i - 1]["count"]
            entry["conv_from_prev"] = round(entry["count"] / prev * 100) if prev > 0 else 0

    leads_by_source = [{"source": r["_id"] or "manual", "count": r["count"]} for r in leads_source_agg]

    return {
        "total_leads": total_leads,
        "leads_this_period": leads_this_month,
        "period_days": period,
        "pipeline_value": pipeline_value,
        "predicted_revenue": round(predicted_revenue, 2),
        "active_clients": active_clients_count,
        "mrr": mrr,
        "ticket_avg": ticket_avg,
        "churn_risk_count": churn_risk_count,
        "conversion_rate": conversion_rate,
        "total_deals": total_deals,
        "won_deals": len(won_deals_list),
        "avg_closing_days": avg_closing_days,
        "deals_by_stage": deals_by_stage,
        "recent_leads": recent_leads,
        "stale_deals": stale_deals,
        "stale_deals_count": len(stale_raw),
        "proposals_no_response": proposals_no_response,
        "proposals_no_response_count": len(proposals_raw),
        "overdue_tasks_count": overdue_tasks_count,
        "leads_by_source": leads_by_source,
    }


# ============= AI ENDPOINTS (Pre-configured) =============

@api_router.post("/ai/qualify-lead")
async def qualify_lead(body: AIRequest, current_user: dict = Depends(get_current_user)):
    """Pre-configured AI endpoint for lead qualification using Anthropic/Gemini"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not llm_key:
        return {"qualification": "IA não configurada. Configure EMERGENT_LLM_KEY.", "score": 50}

    try:
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"qualify_{uuid.uuid4().hex[:8]}",
            system_message=(
                "Você é um especialista em qualificação de leads para agências de marketing digital. "
                "Analise as informações do lead e forneça: 1) Score de 0-100, 2) Potencial do lead, "
                "3) Próximos passos recomendados. Responda sempre em português brasileiro."
            ),
        )
        prompt = f"Qualifique este lead: {body.prompt}"
        if body.context:
            prompt += f"\n\nContexto adicional: {body.context}"
        response = await chat.send_message(UserMessage(content=prompt))
        return {"qualification": response, "status": "success"}
    except Exception as e:
        logger.error(f"AI qualification error: {e}")
        return {"qualification": "Erro ao processar com IA", "error": str(e)}


@api_router.post("/ai/generate-content")
async def generate_content(body: AIRequest, current_user: dict = Depends(get_current_user)):
    """Pre-configured AI endpoint for content generation using Anthropic/Gemini"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not llm_key:
        return {"content": "IA não configurada. Configure EMERGENT_LLM_KEY.", "status": "not_configured"}

    try:
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"content_{uuid.uuid4().hex[:8]}",
            system_message=(
                "Você é um especialista em marketing de conteúdo para redes sociais brasileiras. "
                "Crie conteúdo criativo, engajante e alinhado com as tendências do mercado. "
                "Responda sempre em português brasileiro."
            ),
        )
        response = await chat.send_message(UserMessage(content=body.prompt))
        return {"content": response, "status": "success"}
    except Exception as e:
        logger.error(f"AI content error: {e}")
        return {"content": "Erro ao gerar conteúdo", "error": str(e)}


# ============= API KEYS MANAGEMENT =============

@api_router.get("/settings/api-keys")
async def get_api_keys(current_user: dict = Depends(get_current_user)):
    doc = await db.user_api_keys.find_one({"user_id": current_user["user_id"]}, {"_id": 0})
    if not doc:
        return {"perplexity_key": "", "openai_key": "", "anthropic_key": "", "gemini_key": "", "groq_key": ""}
    def mask(k):
        if not k:
            return ""
        return ("*" * max(0, len(k) - 4)) + k[-4:] if len(k) > 4 else "****"
    return {field: mask(doc.get(field, "")) for field in ["perplexity_key", "openai_key", "anthropic_key", "gemini_key", "groq_key"]}


@api_router.put("/settings/api-keys")
async def update_api_keys(body: ApiKeysUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in body.dict().items() if v is not None}
    if update_data:
        await db.user_api_keys.update_one(
            {"user_id": current_user["user_id"]},
            {"$set": {**update_data, "user_id": current_user["user_id"]}},
            upsert=True
        )
    return {"status": "ok"}


# ============= MULTI-AGENT CAROUSEL =============

async def _get_api_key(user_id: str, provider: str) -> str:
    doc = await db.user_api_keys.find_one({"user_id": user_id}, {"_id": 0})
    key = (doc or {}).get(f"{provider}_key", "")
    if not key:
        raise HTTPException(
            status_code=400,
            detail=f"Chave {provider.upper()} não configurada. Acesse Configurações → Chaves de API."
        )
    return key


async def call_perplexity(api_key: str, prompt: str) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            "https://api.perplexity.ai/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "sonar",
                "messages": [
                    {"role": "system", "content": "Você é um pesquisador especializado em tendências de marketing digital brasileiro. Responda sempre em português."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.2,
                "max_tokens": 2000,
            },
        )
        if r.status_code == 401:
            raise HTTPException(status_code=400, detail="Chave Perplexity inválida. Verifique em Configurações.")
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


async def call_llm_with_vision_anthropic(
    api_key: str,
    system_prompt: str,
    text_prompt: str,
    image_b64: str,
    image_type: str,
) -> str:
    """Chama a API Anthropic com suporte a imagem (visão multimodal)."""
    # Contar quantos slides estão no copy para reforçar no prompt
    slide_count = text_prompt.count("Slide ") or "todos os"
    vision_prompt = (
        f"ATENÇÃO: A imagem acima é APENAS uma referência visual de estilo — NÃO é o conteúdo a copiar.\n"
        f"Você deve gerar TODOS os {slide_count} slides descritos abaixo, usando a imagem somente como inspiração "
        f"para paleta de cores, tipografia e atmosfera visual.\n\n"
        f"REGRAS CRÍTICAS:\n"
        f"- Gere TODOS os slides do conteúdo abaixo, sem exceção\n"
        f"- NÃO omita nenhum slide — se o conteúdo tem 6 slides, o HTML deve ter 6 slides\n"
        f"- A imagem define o ESTILO (cores, fontes, layout), não o número de slides\n"
        f"- Cada slide deve ter seu próprio conteúdo conforme descrito abaixo\n\n"
        + text_prompt
    )
    message_content = [
        {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": image_type,
                "data": image_b64,
            },
        },
        {
            "type": "text",
            "text": vision_prompt,
        },
    ]
    async with httpx.AsyncClient(timeout=180) as client:
        r = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json={
                "model": "claude-sonnet-4-6",
                "max_tokens": 8192,
                "system": system_prompt,
                "messages": [{"role": "user", "content": message_content}],
            },
        )
        if r.status_code == 401:
            raise HTTPException(status_code=400, detail="Chave ANTHROPIC inválida. Verifique em Configurações.")
        if not r.is_success:
            raise HTTPException(status_code=400, detail=f"Erro da API ANTHROPIC ({r.status_code}): {r.text[:300]}")
        return r.json()["content"][0]["text"]


async def call_llm(provider: str, api_key: str, system_prompt: str, user_prompt: str) -> str:
    async with httpx.AsyncClient(timeout=180) as client:
        if provider == "openai":
            r = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": "gpt-4o", "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}], "temperature": 0.7, "max_tokens": 4000},
            )
        elif provider == "anthropic":
            r = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
                json={"model": "claude-sonnet-4-6", "max_tokens": 8192, "system": system_prompt, "messages": [{"role": "user", "content": user_prompt}]},
            )
        elif provider == "gemini":
            r = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}",
                headers={"Content-Type": "application/json"},
                json={"contents": [{"parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}], "generationConfig": {"temperature": 0.7, "maxOutputTokens": 4096}},
            )
        elif provider == "groq":
            r = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": "llama-3.3-70b-versatile", "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}], "temperature": 0.7, "max_tokens": 4000},
            )
        else:
            raise HTTPException(status_code=400, detail=f"Provedor LLM inválido: {provider}")

        if r.status_code == 401:
            raise HTTPException(status_code=400, detail=f"Chave {provider.upper()} inválida. Verifique em Configurações.")
        if not r.is_success:
            raise HTTPException(status_code=400, detail=f"Erro da API {provider.upper()} ({r.status_code}): {r.text[:300]}")

        if provider == "anthropic":
            return r.json()["content"][0]["text"]
        elif provider == "gemini":
            return r.json()["candidates"][0]["content"]["parts"][0]["text"]
        else:
            return r.json()["choices"][0]["message"]["content"]


def _extract_json(text: str):
    m = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
    if m:
        return json_module.loads(m.group(1))
    text = text.strip()
    for start_char in ('[', '{'):
        idx = text.find(start_char)
        if idx != -1:
            try:
                return json_module.loads(text[idx:])
            except Exception:
                pass
    raise ValueError("JSON válido não encontrado na resposta do LLM")


async def _run_agent_job(job_id: str, coro):
    """Executa qualquer etapa do agente em background e salva no MongoDB."""
    try:
        result = await coro
        await db.carousel_agent_jobs.update_one(
            {"job_id": job_id},
            {"$set": {"status": "done", "result": result, "completed_at": datetime.now(timezone.utc).isoformat()}},
        )
    except HTTPException as exc:
        await db.carousel_agent_jobs.update_one(
            {"job_id": job_id},
            {"$set": {"status": "error", "error": exc.detail}},
        )
    except Exception as exc:
        await db.carousel_agent_jobs.update_one(
            {"job_id": job_id},
            {"$set": {"status": "error", "error": str(exc)[:500]}},
        )


@api_router.get("/carousel/agent-job/{job_id}")
async def get_carousel_agent_job(job_id: str, current_user: dict = Depends(get_current_user)):
    """Polling endpoint para qualquer etapa do agente (news/themes/copy)."""
    job = await db.carousel_agent_jobs.find_one(
        {"job_id": job_id, "user_id": current_user["user_id"]},
        {"_id": 0, "job_id": 1, "step": 1, "status": 1, "result": 1, "error": 1},
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    return job


@api_router.post("/carousel/agent/news")
async def carousel_agent_news(body: CarouselNewsRequest, current_user: dict = Depends(get_current_user)):
    api_key = await _get_api_key(current_user["user_id"], body.llm_provider)
    client = await db.clients.find_one({"client_id": body.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    niche = client.get("company") or client.get("name", "marketing digital")
    notes = client.get("notes", "")
    client_name = client.get("name", "")

    prompt = (
        f"Pesquise as notícias e tendências mais relevantes dos últimos {body.period_days} dias para:\n"
        f"Segmento/Empresa: {niche}\n"
        f"Contexto adicional: {notes or 'Negócio digital brasileiro'}\n\n"
        f"Forneça: 1) 5-7 notícias/tendências recentes com título e descrição curta. "
        f"2) Principais tópicos em alta no setor. 3) Oportunidades de conteúdo para Instagram."
    )

    job_id = f"agentjob_{uuid.uuid4().hex[:12]}"
    await db.carousel_agent_jobs.insert_one({
        "job_id": job_id, "user_id": current_user["user_id"], "step": "news",
        "status": "pending", "result": None, "error": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    async def _run():
        if body.llm_provider == "perplexity":
            text = await call_perplexity(api_key, prompt)
        else:
            system = (
                "Você é um pesquisador especializado em tendências de marketing digital e comportamento do consumidor brasileiro. "
                "Analise as tendências, notícias e oportunidades de conteúdo do setor solicitado com base no seu conhecimento. "
                "Responda sempre em português brasileiro com informações práticas e acionáveis."
            )
            text = await call_llm(body.llm_provider, api_key, system, prompt)
        return {"news_context": text, "client_name": client_name, "niche": niche}

    asyncio.create_task(_run_agent_job(job_id, _run()))
    return {"job_id": job_id, "status": "pending"}


@api_router.post("/carousel/agent/themes")
async def carousel_agent_themes(body: CarouselThemesRequest, current_user: dict = Depends(get_current_user)):
    api_key = await _get_api_key(current_user["user_id"], body.llm_provider)
    client = await db.clients.find_one({"client_id": body.client_id}, {"_id": 0})
    niche = ((client.get("company") or client.get("name", "negócio")) if client else "negócio")

    system = "Você é um estrategista de conteúdo sênior para Instagram. Crie temas de alta performance. Responda em português brasileiro."
    prompt = (
        f"Com base nas tendências do setor de {niche}:\n\n{body.news_context}\n\n"
        f"Sugira EXATAMENTE 3 temas para carrossel no Instagram. Responda APENAS com JSON:\n"
        f'[{{"id":1,"title":"Título impactante","angle":"Por que vai engajar","promise":"O que o seguidor aprende","slides_count":6}},'
        f'{{"id":2,"title":"...","angle":"...","promise":"...","slides_count":7}},'
        f'{{"id":3,"title":"...","angle":"...","promise":"...","slides_count":5}}]'
    )

    job_id = f"agentjob_{uuid.uuid4().hex[:12]}"
    await db.carousel_agent_jobs.insert_one({
        "job_id": job_id, "user_id": current_user["user_id"], "step": "themes",
        "status": "pending", "result": None, "error": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    async def _run():
        text = await call_llm(body.llm_provider, api_key, system, prompt)
        try:
            themes = _extract_json(text)
        except Exception:
            raise HTTPException(status_code=500, detail=f"O {body.llm_provider} não retornou JSON válido. Tente novamente.")
        return {"themes": themes}

    asyncio.create_task(_run_agent_job(job_id, _run()))
    return {"job_id": job_id, "status": "pending"}


@api_router.post("/carousel/agent/copy")
async def carousel_agent_copy(body: CarouselCopyRequest, current_user: dict = Depends(get_current_user)):
    api_key = await _get_api_key(current_user["user_id"], body.llm_provider)
    client = await db.clients.find_one({"client_id": body.client_id}, {"_id": 0})
    niche = ((client.get("company") or client.get("name", "negócio")) if client else "negócio")

    system = "Você é um copywriter especialista em Instagram. Crie carrosséis altamente engajantes com ganchos poderosos e CTAs irresistíveis. Responda em português brasileiro."
    prompt = (
        f"Crie o copy completo para um carrossel sobre:\n"
        f"Tema: {body.chosen_theme}\nNicho: {niche}\n"
        f"Contexto de mercado: {body.news_context[:500]}\n\n"
        f"Crie 5-7 slides. Primeiro = capa impactante. Último = CTA forte.\n"
        f"Responda APENAS com JSON:\n"
        f'{{"hook":"Gancho do carrossel","slides":['
        f'{{"number":1,"type":"capa","title":"Título principal","subtitle":"Promessa ou subtítulo","body":""}},'
        f'{{"number":2,"type":"conteudo","title":"Ponto 1","subtitle":"","body":"Texto explicativo"}},'
        f'...,'
        f'{{"number":N,"type":"cta","title":"Ação desejada","subtitle":"Reforço","body":"Hashtags e instrução"}}]}}'
    )

    job_id = f"agentjob_{uuid.uuid4().hex[:12]}"
    await db.carousel_agent_jobs.insert_one({
        "job_id": job_id, "user_id": current_user["user_id"], "step": "copy",
        "status": "pending", "result": None, "error": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    async def _run():
        text = await call_llm(body.llm_provider, api_key, system, prompt)
        try:
            copy_data = _extract_json(text)
        except Exception:
            raise HTTPException(status_code=500, detail=f"O {body.llm_provider} não retornou JSON válido. Tente novamente.")
        return {"copy": copy_data}

    asyncio.create_task(_run_agent_job(job_id, _run()))
    return {"job_id": job_id, "status": "pending"}


async def call_llm_with_vision_openai(
    api_key: str,
    system_prompt: str,
    text_prompt: str,
    image_b64: str,
    image_type: str,
) -> str:
    message_content = [
        {"type": "image_url", "image_url": {"url": f"data:{image_type};base64,{image_b64}", "detail": "high"}},
        {"type": "text", "text": text_prompt},
    ]
    async with httpx.AsyncClient(timeout=180) as client:
        r = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message_content},
                ],
                "max_tokens": 4000,
                "temperature": 0.7,
            },
        )
        if r.status_code == 401:
            raise HTTPException(status_code=400, detail="Chave OPENAI inválida. Verifique em Configurações.")
        if not r.is_success:
            raise HTTPException(status_code=400, detail=f"Erro OpenAI Vision ({r.status_code}): {r.text[:300]}")
        return r.json()["choices"][0]["message"]["content"]


async def call_llm_with_vision_gemini(
    api_key: str,
    system_prompt: str,
    text_prompt: str,
    image_b64: str,
    image_type: str,
) -> str:
    async with httpx.AsyncClient(timeout=180) as client:
        r = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}",
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{
                    "parts": [
                        {"inline_data": {"mime_type": image_type, "data": image_b64}},
                        {"text": f"{system_prompt}\n\n{text_prompt}"},
                    ]
                }],
                "generationConfig": {"temperature": 0.7, "maxOutputTokens": 4096},
            },
        )
        if not r.is_success:
            raise HTTPException(status_code=400, detail=f"Erro Gemini Vision ({r.status_code}): {r.text[:300]}")
        return r.json()["candidates"][0]["content"]["parts"][0]["text"]


    # ──────────────────────────────────────────────────────────────────
    # MANDATORY JS TEMPLATE — included verbatim in every prompt
    # ──────────────────────────────────────────────────────────────────
    JS_TEMPLATE = """
<script>
(function() {
  var slides = document.querySelectorAll('.slide');
  var total   = slides.length;
  var current = 0;

  function goTo(n) {
    slides[current].classList.remove('active');
    current = ((n % total) + total) % total;
    slides[current].classList.add('active');
    updateNav();
  }

  function updateNav() {
    var counter = document.querySelector('.slide-counter');
    if (counter) counter.textContent = (current + 1) + ' / ' + total;
    document.querySelectorAll('.dot').forEach(function(d, i) {
      d.classList.toggle('active', i === current);
    });
  }

  var prevBtn = document.querySelector('.prev');
  var nextBtn = document.querySelector('.next');
  if (prevBtn) prevBtn.addEventListener('click', function() { goTo(current - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function() { goTo(current + 1); });

  document.querySelectorAll('.dot').forEach(function(d, i) {
    d.addEventListener('click', function() { goTo(i); });
  });

  window.addEventListener('message', function(e) {
    if (e.data && e.data.action === 'carousel-next') goTo(current + 1);
    if (e.data && e.data.action === 'carousel-prev') goTo(current - 1);
  });

  window.nextSlide = function() { goTo(current + 1); };
  window.prevSlide = function() { goTo(current - 1); };
  window.goTo      = goTo;

  goTo(0);
})();
</script>"""

    NAV_HINT = (
        "ESTRUTURA OBRIGATÓRIA DE CADA SLIDE:\n"
        "  <div class=\"slide\">  ← class EXATAMENTE 'slide'\n"
        "    <!-- conteúdo -->\n"
        "    <button class=\"prev\">←</button>\n"
        "    <span class=\"slide-counter\"></span>\n"
        "    <button class=\"next\">→</button>\n"
        "  </div>\n\n"
        "SCRIPT OBRIGATÓRIO antes do </body>:\n"
        + JS_TEMPLATE +
        "\n⚠ NUNCA omita este script. Sem ele os slides não trocam."
    )

    if has_template:
        system = (
            "Você é um designer senior de carrosséis para Instagram, especialista em HTML/CSS/JS. "
            "O usuário enviou uma IMAGEM DE TEMPLATE — replique FIELMENTE: paleta, tipografia, layout e atmosfera. "
            "REGRAS ABSOLUTAS:\n"
            "- Replique as cores, fontes e layout da imagem de referência em TODOS os slides\n"
            "- Cada slide: exatamente 1080x1080px, class='slide'\n"
            "- INCLUA o script de navegação obrigatório conforme especificado no prompt\n"
            "- Texto legível com contraste adequado\n"
            "RETORNE APENAS O CÓDIGO HTML COMPLETO. Sem markdown."
        )
    else:
        style_hint = ""
        if client_notes:
            style_hint = (
                f"\n=== ESTILO BASEADO NAS NOTAS DO CLIENTE ===\n"
                f"{client_notes}\n"
                f"Use essas informações para definir cores, tom e identidade visual.\n"
            )
        system = (
            "Você é um designer senior de carrosséis para Instagram, especialista em HTML/CSS/JS. "
            "Estilo moderno e profissional.\n"
            "REGRAS ABSOLUTAS:\n"
            "- NUNCA use fundo preto puro — use gradientes coloridos vibrantes\n"
            "- Cada slide: exatamente 1080x1080px, class='slide'\n"
            "- INCLUA o script de navegação obrigatório conforme especificado no prompt\n"
            f"{style_hint}"
            "RETORNE APENAS O CÓDIGO HTML COMPLETO. Sem markdown."
        )

    if body.change_request and body.current_html:
        prompt = (
            f"Você gerou o carrossel HTML abaixo. O usuário pediu as seguintes alterações:\n\n"
            f"=== ALTERAÇÕES SOLICITADAS ===\n{body.change_request}\n\n"
            f"=== HTML ATUAL ===\n{body.current_html[:6000]}\n\n"
            f"Aplique APENAS as alterações pedidas. Preserve slides, textos e estilos.\n"
            f"OBRIGATÓRIO: mantenha o script de navegação abaixo antes do </body>:\n{JS_TEMPLATE}\n"
            f"Retorne APENAS o HTML completo modificado. Sem texto antes ou depois."
        )
    else:
        template_instruction = ""
        if has_template:
            template_instruction = (
                "ATENÇÃO: A imagem acima é o TEMPLATE DE ESTILO — replique suas cores, fontes e layout em TODOS os slides.\n"
                "NÃO copie o conteúdo da imagem. Use-a apenas como referência visual.\n\n"
            )
        prompt = (
            f"{template_instruction}"
            f"Crie um carrossel interativo para Instagram em HTML/CSS/JS com os slides abaixo.\n\n"
            f"=== CONTEÚDO DOS SLIDES ===\n{body.copy_content}\n\n"
            f"=== CONTEXTO ===\nTema: {body.chosen_theme}\nMarca/Cliente: {client_name}\n\n"
            f"=== ESPECIFICAÇÕES TÉCNICAS ===\n"
            f"- Cada slide: exatamente 1080x1080px (quadrado Instagram)\n"
            f"- Google Fonts: Outfit (wght@600;700) + Plus Jakarta Sans (wght@400;500) via CDN\n"
            f"- Títulos: Outfit, 52-72px, font-weight 700\n"
            f"- Corpo: Plus Jakarta Sans, 24-30px, font-weight 400\n"
            f"- Todo CSS no <style> interno do <head>\n\n"
            f"=== NAVEGAÇÃO OBRIGATÓRIA ===\n{NAV_HINT}\n\n"
            f"=== DESIGN ===\n"
            f"- Slide CAPA: gradiente diagonal vibrante, título 64-72px centralizado em branco\n"
            f"- Slides CONTEÚDO: borda colorida à esquerda (4px), número do slide em destaque\n"
            f"- Slide CTA: gradiente forte, botão de ação grande com border-radius 50px\n"
            f"Retorne APENAS o HTML completo começando com <!DOCTYPE html>."
        )
    try:
        if has_template:
            img_b64 = body.template_image_b64
            img_type = body.template_image_type or "image/jpeg"
            if body.llm_provider == "anthropic":
                result = await call_llm_with_vision_anthropic(
                    api_key=api_key, system_prompt=system, text_prompt=prompt,
                    image_b64=img_b64, image_type=img_type,
                )
            elif body.llm_provider == "openai":
                result = await call_llm_with_vision_openai(
                    api_key=api_key, system_prompt=system, text_prompt=prompt,
                    image_b64=img_b64, image_type=img_type,
                )
            elif body.llm_provider == "gemini":
                result = await call_llm_with_vision_gemini(
                    api_key=api_key, system_prompt=system, text_prompt=prompt,
                    image_b64=img_b64, image_type=img_type,
                )
            else:
                # Groq/Perplexity: no vision support, fallback to text with style hint in prompt
                result = await call_llm(body.llm_provider, api_key, system, prompt)
        else:
            result = await call_llm(body.llm_provider, api_key, system, prompt)

        html_m = re.search(r'```html\s*(.*?)\s*```', result, re.DOTALL)
        if html_m:
            html = html_m.group(1)
        elif '<!DOCTYPE' in result or '<html' in result.lower():
            idx = result.find('<!DOCTYPE')
            if idx == -1:
                idx = result.lower().find('<html')
            html = result[idx:] if idx != -1 else result.strip()
        else:
            html = result.strip()

        if html and '<style' not in html.lower() and '<body' in html.lower():
            fallback_css = (
                "<style>body{margin:0;background:linear-gradient(135deg,#667eea,#764ba2);"
                "font-family:'Plus Jakarta Sans',sans-serif;color:#fff;display:flex;"
                "align-items:center;justify-content:center;min-height:100vh;}</style>"
            )
            html = html.replace('<head>', f'<head>{fallback_css}', 1)

        await db.carousel_jobs.update_one(
            {"job_id": job_id},
            {"$set": {"status": "done", "html_content": html, "completed_at": datetime.now(timezone.utc).isoformat()}},
        )
    except Exception as e:
        error_msg = str(e)[:500]
        await db.carousel_jobs.update_one(
            {"job_id": job_id},
            {"$set": {"status": "error", "error": error_msg}},
        )


@api_router.post("/carousel/agent/design")
async def carousel_agent_design(body: CarouselDesignRequest, current_user: dict = Depends(get_current_user)):
    api_key = await _get_api_key(current_user["user_id"], body.llm_provider)
    client = await db.clients.find_one({"client_id": body.client_id}, {"_id": 0})
    client_name = client.get("name", "Cliente") if client else "Cliente"
    client_notes = (client.get("notes") or "") if client else ""

    job_id = f"carjob_{uuid.uuid4().hex[:12]}"
    await db.carousel_jobs.insert_one({
        "job_id": job_id,
        "user_id": current_user["user_id"],
        "status": "pending",
        "html_content": None,
        "error": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    asyncio.create_task(_run_carousel_design_job(job_id, body, api_key, client_name, client_notes))

    return {"job_id": job_id, "status": "pending"}


@api_router.get("/carousel/job/{job_id}")
async def get_carousel_job(job_id: str, current_user: dict = Depends(get_current_user)):
    job = await db.carousel_jobs.find_one(
        {"job_id": job_id, "user_id": current_user["user_id"]},
        {"_id": 0, "html_content": 1, "status": 1, "error": 1, "job_id": 1},
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    return job


@api_router.post("/carousel/save")
async def save_carousel(body: CarouselSaveRequest, current_user: dict = Depends(get_current_user)):
    cid = f"carousel_{uuid.uuid4().hex[:12]}"
    await db.carousel_history.insert_one({
        "carousel_id": cid,
        "user_id": current_user["user_id"],
        "client_id": body.client_id,
        "client_name": body.client_name,
        "theme": body.theme,
        "html_content": body.html_content,
        "llm_provider": body.llm_provider,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"carousel_id": cid, "message": "Carrossel salvo com sucesso"}


@api_router.get("/carousel/history")
async def get_carousel_history(current_user: dict = Depends(get_current_user)):
    cursor = db.carousel_history.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0, "html_content": 0}
    ).sort("created_at", -1).limit(20)
    return await cursor.to_list(20)


@api_router.get("/carousel/history/{carousel_id}")
async def get_carousel_detail(carousel_id: str, current_user: dict = Depends(get_current_user)):
    doc = await db.carousel_history.find_one(
        {"carousel_id": carousel_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Carrossel não encontrado")
    return doc


# ============= STARTUP / SHUTDOWN =============

# ============= WHATSAPP MODELS =============

class WhatsAppAgentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    phone_number: Optional[str] = None
    n8n_webhook_url: Optional[str] = None

class WhatsAppAgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    phone_number: Optional[str] = None
    n8n_webhook_url: Optional[str] = None
    is_active: Optional[bool] = None

class WhatsAppWebhookSettings(BaseModel):
    webhook_url: str
    enabled: bool = True

class WhatsAppLeadPayload(BaseModel):
    name: str
    phone: Optional[str] = None
    message: Optional[str] = None
    source: str = "whatsapp"


# ============= WHATSAPP AGENTS ENDPOINTS =============

@api_router.get("/whatsapp/agents")
async def list_whatsapp_agents(current_user: dict = Depends(get_current_user)):
    agents = await db.whatsapp_agents.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return agents


@api_router.post("/whatsapp/agents")
async def create_whatsapp_agent(body: WhatsAppAgentCreate, current_user: dict = Depends(get_current_user)):
    agent_id = f"waid_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "agent_id": agent_id,
        **body.model_dump(),
        "is_active": False,
        "user_id": current_user["user_id"],
        "created_at": now,
        "updated_at": now,
    }
    await db.whatsapp_agents.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api_router.patch("/whatsapp/agents/{agent_id}")
async def update_whatsapp_agent(agent_id: str, body: WhatsAppAgentUpdate, current_user: dict = Depends(get_current_user)):
    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.whatsapp_agents.update_one({"agent_id": agent_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Agente não encontrado")
    return await db.whatsapp_agents.find_one({"agent_id": agent_id}, {"_id": 0})


@api_router.post("/whatsapp/agents/{agent_id}/toggle")
async def toggle_whatsapp_agent(agent_id: str, current_user: dict = Depends(get_current_user)):
    agent = await db.whatsapp_agents.find_one({"agent_id": agent_id}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agente não encontrado")
    new_status = not agent.get("is_active", False)
    now = datetime.now(timezone.utc).isoformat()
    await db.whatsapp_agents.update_one(
        {"agent_id": agent_id},
        {"$set": {"is_active": new_status, "updated_at": now}},
    )
    # If agent has a N8N webhook URL, notify N8N about status change
    if agent.get("n8n_webhook_url"):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.post(agent["n8n_webhook_url"], json={
                    "action": "activate" if new_status else "stop",
                    "agent_id": agent_id,
                    "agent_name": agent.get("name", ""),
                    "is_active": new_status,
                })
        except Exception as exc:
            logger.warning(f"N8N toggle notification failed: {exc}")
    agent["is_active"] = new_status
    return agent


@api_router.delete("/whatsapp/agents/{agent_id}")
async def delete_whatsapp_agent(agent_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.whatsapp_agents.delete_one({"agent_id": agent_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Agente não encontrado")
    return {"message": "Agente removido com sucesso"}


# ============= WHATSAPP WEBHOOK SETTINGS =============

@api_router.get("/settings/whatsapp-webhook")
async def get_whatsapp_webhook_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"setting_id": "webhook_whatsapp"}, {"_id": 0})
    if not settings:
        return {"webhook_url": "", "enabled": True}
    return {"webhook_url": settings.get("webhook_url", ""), "enabled": settings.get("enabled", True)}


@api_router.put("/settings/whatsapp-webhook")
async def save_whatsapp_webhook_settings(body: WhatsAppWebhookSettings, current_user: dict = Depends(get_current_user)):
    await db.settings.update_one(
        {"setting_id": "webhook_whatsapp"},
        {"$set": {
            "setting_id": "webhook_whatsapp",
            "webhook_url": body.webhook_url,
            "enabled": body.enabled,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"message": "Configuração salva", "webhook_url": body.webhook_url, "enabled": body.enabled}


# ============= PUBLIC WEBHOOK — N8N → AgênciaOS =============

def normalize_source(raw: str) -> str:
    """Normalize source string to match frontend SOURCES values."""
    mapping = {
        "formulário": "formulario", "formulario": "formulario", "form": "formulario",
        "whatsapp": "whatsapp", "instagram": "instagram",
        "google": "google", "site": "site",
        "indicação": "indicacao", "indicacao": "indicacao", "referral": "indicacao",
        "manual": "manual", "outro": "outro", "other": "outro",
    }
    return mapping.get(raw.strip().lower(), raw.strip().lower())


@app.post("/api/webhook/whatsapp-lead")
async def receive_whatsapp_lead(body: WhatsAppLeadPayload):
    """
    Public endpoint (no auth) — N8N calls this when a WhatsApp message arrives.
    Creates a Lead automatically with source='whatsapp'.
    """
    # Check if settings allow ingestion
    settings = await db.settings.find_one({"setting_id": "webhook_whatsapp"}, {"_id": 0})
    if settings and settings.get("enabled") is False:
        raise HTTPException(status_code=403, detail="Recepção de leads via WhatsApp está desativada")

    lead_id = f"lead_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    lead_doc = {
        "lead_id": lead_id,
        "name": body.name,
        "phone": body.phone or "",
        "email": None,
        "company": None,
        "source": normalize_source(body.source),
        "status": "novo",
        "score": 50,
        "notes": body.message or "",
        "user_id": "webhook",
        "created_at": now,
        "updated_at": now,
    }
    await db.leads.insert_one(lead_doc)
    logger.info(f"WhatsApp lead created: {lead_id} — {body.name} (source: {normalize_source(body.source)})")
    return {"success": True, "lead_id": lead_id, "source": normalize_source(body.source), "name": body.name}


# ============= PUBLIC WEBHOOK — Instagram → AgênciaOS =============

class InstagramLeadPayload(BaseModel):
    name: str
    phone: Optional[str] = None
    instagram_handle: Optional[str] = None
    message: Optional[str] = None
    source: str = "instagram"


@app.post("/api/webhook/instagram-lead")
async def receive_instagram_lead(body: InstagramLeadPayload):
    """
    Public endpoint (no auth) — N8N calls this when an Instagram DM arrives.
    Creates a Lead automatically with source='instagram'.
    """
    notes_parts = []
    if body.instagram_handle:
        notes_parts.append(f"Instagram: {body.instagram_handle}")
    if body.message:
        notes_parts.append(body.message)
    notes = "\n".join(notes_parts)

    lead_id = f"lead_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    lead_doc = {
        "lead_id": lead_id,
        "name": body.name,
        "phone": body.phone or "",
        "email": None,
        "company": None,
        "source": normalize_source(body.source),
        "status": "novo",
        "score": 50,
        "notes": notes,
        "user_id": "webhook",
        "created_at": now,
        "updated_at": now,
    }
    await db.leads.insert_one(lead_doc)
    logger.info(f"Instagram lead created: {lead_id} — {body.name} (source: {normalize_source(body.source)})")

    # Auto-create deal in Instagram pipeline if a stage exists
    instagram_stage = await db.pipeline_stages.find_one(
        {"pipeline_type": "instagram"}, sort=[("order", 1)]
    )
    if instagram_stage:
        deal_id_ig = f"deal_{uuid.uuid4().hex[:10]}"
        ig_deal_doc = {
            "deal_id": deal_id_ig,
            "title": body.name,
            "value": 0,
            "stage_id": instagram_stage["stage_id"],
            "lead_id": lead_id,
            "contact_name": body.name,
            "phone": body.phone or "",
            "email": None,
            "notes": notes,
            "pipeline_type": "instagram",
            "instagram_handle": body.instagram_handle or "",
            "user_id": "webhook",
            "created_at": now,
            "updated_at": now,
        }
        await db.deals.insert_one(ig_deal_doc)

    return {"success": True, "lead_id": lead_id, "source": normalize_source(body.source), "name": body.name}


# ============= PUBLIC WEBHOOK — Genérico (qualquer origem) =============

class GenericLeadPayload(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    message: Optional[str] = None
    instagram_handle: Optional[str] = None
    source: str = "outro"


@app.post("/api/webhook/lead")
async def receive_generic_lead(body: GenericLeadPayload):
    """
    Public endpoint (no auth) — generic webhook accepted from any source.
    source='Formulário' / 'formulario' / 'whatsapp' etc. are all normalized.
    """
    notes_parts = []
    if body.instagram_handle:
        notes_parts.append(f"Instagram: {body.instagram_handle}")
    if body.message:
        notes_parts.append(body.message)
    notes = "\n".join(notes_parts)

    lead_id = f"lead_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    lead_doc = {
        "lead_id": lead_id,
        "name": body.name,
        "phone": body.phone or "",
        "email": body.email,
        "company": body.company,
        "source": normalize_source(body.source),
        "status": "novo",
        "score": 50,
        "notes": notes,
        "user_id": "webhook",
        "created_at": now,
        "updated_at": now,
    }
    await db.leads.insert_one(lead_doc)
    logger.info(f"Generic lead created: {lead_id} — {body.name} (source: {body.source} → {normalize_source(body.source)})")
    return {"success": True, "lead_id": lead_id, "source": normalize_source(body.source)}


# ============= PUBLIC WEBHOOK — Meeting Schedule → N8N =============

class MeetingSchedulePayload(BaseModel):
    dealId: str
    contactName: str
    email: str
    meetingTitle: str
    meetingDate: str
    startTime: str
    endTime: str
    notes: Optional[str] = None
    scheduledAt: Optional[str] = None


class MeetingWebhookSettings(BaseModel):
    webhook_url: str = ""
    enabled: bool = True


@app.post("/api/webhook/meeting-schedule")
async def forward_meeting_schedule(body: MeetingSchedulePayload):
    """
    Public endpoint — frontend calls this after confirming a meeting.
    Forwards the meeting payload to the N8N URL configured in settings.
    """
    settings = await db.settings.find_one({"setting_id": "webhook_meeting"}, {"_id": 0})
    webhook_url = settings.get("webhook_url", "") if settings else ""
    enabled = settings.get("enabled", True) if settings else True

    if webhook_url and enabled:
        payload = body.model_dump()
        payload["scheduledAt"] = payload.get("scheduledAt") or datetime.now(timezone.utc).isoformat()
        try:
            async with httpx.AsyncClient(timeout=15.0) as http_client:
                await http_client.post(webhook_url, json=payload,
                                       headers={"Content-Type": "application/json"})
        except Exception as exc:
            logger.warning(f"Meeting webhook forward failed: {exc}")

    return {"success": True, "received": True}


@api_router.get("/settings/meeting-webhook")
async def get_meeting_webhook_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"setting_id": "webhook_meeting"}, {"_id": 0})
    if not settings:
        return {"webhook_url": "", "enabled": True}
    return {"webhook_url": settings.get("webhook_url", ""), "enabled": settings.get("enabled", True)}


@api_router.put("/settings/meeting-webhook")
async def save_meeting_webhook_settings(body: MeetingWebhookSettings, current_user: dict = Depends(get_current_user)):
    await db.settings.update_one(
        {"setting_id": "webhook_meeting"},
        {"$set": {
            "setting_id": "webhook_meeting",
            "webhook_url": body.webhook_url,
            "enabled": body.enabled,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"message": "Configuração salva", "webhook_url": body.webhook_url, "enabled": body.enabled}


# ============= INSTAGRAM API SETTINGS =============

class InstagramApiSettings(BaseModel):
    page_access_token: str = ""
    instagram_account_id: str = ""
    verify_token: str = ""


@api_router.get("/settings/instagram-api")
async def get_instagram_api_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"setting_id": "instagram_api"}, {"_id": 0})
    if not settings:
        return {"page_access_token": "", "instagram_account_id": "", "verify_token": ""}
    token = settings.get("page_access_token", "")
    masked_token = ("****" + token[-4:]) if len(token) > 4 else ("" if not token else "****")
    return {
        "page_access_token": masked_token,
        "instagram_account_id": settings.get("instagram_account_id", ""),
        "verify_token": settings.get("verify_token", ""),
    }


@api_router.put("/settings/instagram-api")
async def save_instagram_api_settings(body: InstagramApiSettings, current_user: dict = Depends(get_current_user)):
    update_fields: Dict[str, Any] = {
        "setting_id": "instagram_api",
        "instagram_account_id": body.instagram_account_id,
        "verify_token": body.verify_token,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    # Only update token if it's not a masked value
    if body.page_access_token and not body.page_access_token.startswith("****"):
        update_fields["page_access_token"] = body.page_access_token
    await db.settings.update_one(
        {"setting_id": "instagram_api"},
        {"$set": update_fields},
        upsert=True,
    )
    return {"message": "Configurações do Instagram salvas com sucesso"}


# ============= INSTAGRAM META WEBHOOK (Public) =============

@app.get("/api/webhook/instagram")
async def instagram_webhook_verify(request: Request):
    """Meta webhook verification challenge."""
    mode = request.query_params.get("hub.mode")
    verify_token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    if mode == "subscribe":
        settings = await db.settings.find_one({"setting_id": "instagram_api"}, {"_id": 0})
        stored_token = settings.get("verify_token", "") if settings else ""
        if stored_token and verify_token == stored_token:
            from fastapi.responses import PlainTextResponse
            return PlainTextResponse(content=challenge or "", status_code=200)
    from fastapi.responses import Response as FResponse
    return FResponse(status_code=403)


@app.post("/api/webhook/instagram")
async def instagram_webhook_receive(request: Request):
    """Receive DMs from Meta Instagram webhook."""
    try:
        payload = await request.json()
    except Exception:
        return {"ok": False}

    entries = payload.get("entry", [])
    now = datetime.now(timezone.utc).isoformat()

    for entry in entries:
        for messaging in entry.get("messaging", []):
            sender_id = messaging.get("sender", {}).get("id")
            msg_text = messaging.get("message", {}).get("text")
            if not sender_id or not msg_text:
                continue

            # Find or create conversation
            conv = await db.instagram_conversations.find_one(
                {"instagram_scoped_id": sender_id}, {"_id": 0}
            )
            message_doc = {
                "message_id": f"msg_{uuid.uuid4().hex[:10]}",
                "direction": "inbound",
                "text": msg_text,
                "timestamp": now,
                "read": False,
            }
            if conv:
                await db.instagram_conversations.update_one(
                    {"instagram_scoped_id": sender_id},
                    {
                        "$push": {"messages": message_doc},
                        "$set": {"updated_at": now},
                    },
                )
            else:
                conv_id = f"igconv_{uuid.uuid4().hex[:10]}"
                await db.instagram_conversations.insert_one({
                    "conversation_id": conv_id,
                    "lead_id": None,
                    "instagram_scoped_id": sender_id,
                    "instagram_handle": f"@{sender_id}",
                    "messages": [message_doc],
                    "user_id": "webhook",
                    "created_at": now,
                    "updated_at": now,
                })

    return {"ok": True}


# ============= INSTAGRAM CONVERSATIONS =============

class InstagramMessageSend(BaseModel):
    text: str


@api_router.get("/instagram/conversations")
async def list_instagram_conversations(current_user: dict = Depends(get_current_user)):
    convs = await db.instagram_conversations.find({}, {"_id": 0}).sort("updated_at", -1).to_list(200)
    result = []
    for c in convs:
        msgs = c.get("messages", [])
        unread = sum(1 for m in msgs if m.get("direction") == "inbound" and not m.get("read"))
        last_msg = msgs[-1] if msgs else None
        result.append({
            "conversation_id": c["conversation_id"],
            "lead_id": c.get("lead_id"),
            "instagram_scoped_id": c["instagram_scoped_id"],
            "instagram_handle": c.get("instagram_handle", ""),
            "unread_count": unread,
            "last_text": last_msg["text"] if last_msg else "",
            "last_timestamp": last_msg["timestamp"] if last_msg else c.get("updated_at"),
            "updated_at": c.get("updated_at"),
        })
    return result


@api_router.get("/instagram/conversations/{conversation_id}")
async def get_instagram_conversation(conversation_id: str, current_user: dict = Depends(get_current_user)):
    conv = await db.instagram_conversations.find_one({"conversation_id": conversation_id}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversa não encontrada")
    return conv


@api_router.post("/instagram/conversations/{conversation_id}/messages")
async def send_instagram_message(
    conversation_id: str,
    body: InstagramMessageSend,
    current_user: dict = Depends(get_current_user),
):
    conv = await db.instagram_conversations.find_one({"conversation_id": conversation_id}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversa não encontrada")

    settings = await db.settings.find_one({"setting_id": "instagram_api"}, {"_id": 0})
    access_token = settings.get("page_access_token", "") if settings else ""
    if not access_token:
        raise HTTPException(status_code=400, detail="Page Access Token não configurado em Configurações > Instagram API")

    recipient_id = conv["instagram_scoped_id"]
    try:
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            resp = await http_client.post(
                "https://graph.facebook.com/v18.0/me/messages",
                params={"access_token": access_token},
                json={"recipient": {"id": recipient_id}, "message": {"text": body.text}},
            )
            if resp.status_code >= 400:
                raise HTTPException(status_code=resp.status_code, detail=f"Graph API error: {resp.text[:200]}")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro ao enviar mensagem: {str(exc)}")

    now = datetime.now(timezone.utc).isoformat()
    message_doc = {
        "message_id": f"msg_{uuid.uuid4().hex[:10]}",
        "direction": "outbound",
        "text": body.text,
        "timestamp": now,
        "read": True,
    }
    await db.instagram_conversations.update_one(
        {"conversation_id": conversation_id},
        {"$push": {"messages": message_doc}, "$set": {"updated_at": now}},
    )
    return message_doc


@api_router.patch("/instagram/conversations/{conversation_id}/read-all")
async def mark_conversation_read(conversation_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.instagram_conversations.update_one(
        {"conversation_id": conversation_id},
        {"$set": {"messages.$[elem].read": True, "updated_at": datetime.now(timezone.utc).isoformat()}},
        array_filters=[{"elem.direction": "inbound"}],
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Conversa não encontrada")
    return {"ok": True}


@app.on_event("startup")
async def startup_event():
    count = await db.pipeline_stages.count_documents({})
    if count == 0:
        default_stages = [
            {"stage_id": "stage_prosp01", "name": "Prospecção", "color": "#6366F1", "order": 0},
            {"stage_id": "stage_qualif01", "name": "Qualificação", "color": "#3B82F6", "order": 1},
            {"stage_id": "stage_propos01", "name": "Proposta", "color": "#F59E0B", "order": 2},
            {"stage_id": "stage_negoc01", "name": "Negociação", "color": "#EF4444", "order": 3},
            {"stage_id": "stage_ganho01", "name": "Fechado Ganho", "color": "#10B981", "order": 4},
            {"stage_id": "stage_perdi01", "name": "Fechado Perdido", "color": "#6B7280", "order": 5},
        ]
        await db.pipeline_stages.insert_many(default_stages)
        logger.info("Pipeline stages seeded successfully")


@app.on_event("shutdown")
async def shutdown_db_client():
    db_client.close()


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
