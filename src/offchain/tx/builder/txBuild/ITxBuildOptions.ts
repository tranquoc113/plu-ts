import { ExBudget } from "../../../../onchain/CEK/Machine/ExBudget";
import { PureUPLCTerm } from "../../../../onchain/UPLC/UPLCTerm";
import { Data } from "../../../../types/Data";
import { TxRedeemer } from "../../TxWitnessSet/TxRedeemer";

export interface ITxBuildOptions {
    onScriptInvalid?: ( rdmr: TxRedeemer, logs: string[], callArgs: Data[] ) => void
    onScriptResult?:  ( rdmr: TxRedeemer, result: PureUPLCTerm, exBudget: ExBudget, logs: string[], callArgs: Data[] ) => void
}