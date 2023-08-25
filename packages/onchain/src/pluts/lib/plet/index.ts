import type { PType } from "../../PType";
import type { PAlias } from "../../PTypes/PAlias/palias";
import type { TermAlias } from "../std/UtilityTerms/TermAlias";
import { IRApp } from "../../../IR/IRNodes/IRApp";
import { IRFunc } from "../../../IR/IRNodes/IRFunc";
import { IRLetted } from "../../../IR/IRNodes/IRLetted";
import { IRVar } from "../../../IR/IRNodes/IRVar";
import { Term } from "../../Term";
import { PrimType } from "../../type_system/types";
import { _fromData } from "../std/data/conversion/fromData_minimal";
import { IRHoisted } from "../../../IR/IRNodes/IRHoisted";
import { isClosedIRTerm } from "../../../IR/utils/isClosedIRTerm";
import { UtilityTermOf, addUtilityForType } from "../std/UtilityTerms/addUtilityForType";
import { makeMockUtilityTerm } from "../std/UtilityTerms/mockUtilityTerms/makeMockUtilityTerm";

export type LettedTerm<PVarT extends PType, SomeExtension extends object> = UtilityTermOf<PVarT> & {
    in: 
        Term<PVarT> & SomeExtension extends Term<PAlias<PVarT, {}>> ?
            <PExprResult extends PType>( expr: (value: TermAlias<PVarT, {}> & SomeExtension) => Term<PExprResult> ) => Term<PExprResult>
        : <PExprResult extends PType>( expr: (value: UtilityTermOf<PVarT>) => Term<PExprResult> ) => Term<PExprResult>
}

export function plet<PVarT extends PType, SomeExtension extends object>( varValue: Term<PVarT> & SomeExtension ): LettedTerm<PVarT, SomeExtension>
{
    type TermPVar = Term<PVarT> & SomeExtension;

    // unwrap 'asData' if is the case
    varValue = (varValue.type[0] === PrimType.AsData ? _fromData( varValue.type[1] )( varValue as any ) : varValue) as any;

    const type = varValue.type;

    const letted = new Term(
        type,
        dbn => {

            const ir =  varValue.toIR( dbn );

            // `compileIRToUPLC` can handle it even if this check is not present
            // but why spend useful tree iterations if we can avoid them here?
            if(
                ir instanceof IRLetted || 
                ir instanceof IRHoisted || 
                ir instanceof IRVar 
            )
            {
                return ir;
            }

            if( isClosedIRTerm( ir ) )
            {
                return new IRHoisted( ir );
            }

            return new IRLetted(
                Number( dbn ),
                ir
            );
        }
    );
    
    const continuation = <PExprResult extends PType>( expr: (value: TermPVar) => Term<PExprResult> ): Term<PExprResult> => {

        // only to extracts the type; never compiled
        const outType = expr( makeMockUtilityTerm( varValue.type ) as any ).type;

        // return papp( plam( varValue.type, outType )( expr as any ), varValue as any ) as any;
        const term = new Term(
            outType,
            dbn => {

                const withUtility = addUtilityForType( varValue.type );

                const arg = varValue.toIR( dbn );

                if(
                    // inline variables; no need to add an application since already in scope
                    arg instanceof IRVar
                )
                {
                    return expr( withUtility( varValue as any ) as any ).toIR( dbn );
                }

                return new IRApp(
                    new IRFunc(
                        1,
                        expr(
                            withUtility(
                                new Term(
                                    varValue.type,
                                    varAccessDbn => new IRVar( varAccessDbn - ( dbn + BigInt(1) ) ) // point to the lambda generated here
                                ) as any
                            ) as any
                        ).toIR( ( dbn + BigInt(1) ) )
                    ),
                    arg
                )
            }
        );

        return term;
    }
    
    const lettedUtility = addUtilityForType( type )( letted );

    Object.defineProperty(
        lettedUtility, "in", {
            value: continuation,
            writable: false,
            enumerable: false,
            configurable: false
        }
    );

    return lettedUtility as any;
}