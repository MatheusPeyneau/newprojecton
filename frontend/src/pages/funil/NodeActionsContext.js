import { createContext, useContext } from "react";
export const NodeActionsContext = createContext(null);
export const useNodeActions = () => useContext(NodeActionsContext);
