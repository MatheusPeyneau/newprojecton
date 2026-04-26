import * as I from './Icons';

const ICONS = {
  leads: I.UserPlus,
  pipeline: I.Pipeline,
  clientes: I.Users,
  operacional: I.Briefcase,
  financeiro: I.Wallet,
  conteudo: I.FileText,
  funil: I.Funnel,
  configuracoes: I.Settings,
  admin: I.Shield,
};

export default function PlaceholderPage({ section, title }) {
  const IconCmp = ICONS[section] || I.Sparkle;
  return (
    <div className="grid h-full place-items-center py-24">
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-10 py-12 text-center dark:border-white/[0.08] dark:bg-white/[0.02]">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
          <IconCmp size={20} />
        </div>
        <h3 className="mt-4 text-[16px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{title || section}</h3>
        <p className="mt-1 text-[12.5px] text-zinc-500">Esta seção está sendo construída.</p>
      </div>
    </div>
  );
}
