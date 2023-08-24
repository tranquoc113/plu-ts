import type { PType } from "../../../PType"
import type { PBool, TermFn, PDelayed } from "../../../PTypes"
import type { PappArg } from "../../pappArg"
import { Term } from "../../../Term"
import { pBool } from "../bool/pBool"
import { por, pstrictOr, pand, pstrictAnd } from "../../builtins/bool"
import { delayed } from "../../../type_system/types"
import { IRDelayed } from "../../../../IR/IRNodes/IRDelayed"
import { definePropertyIfNotPresent, defineReadOnlyProperty } from "@harmoniclabs/obj-utils"


export type TermBool = Term<PBool> & {

    readonly por:            TermFn<[ PDelayed<PBool> ], PBool>
    readonly or:                ( other: PappArg<PBool> ) => TermBool

    readonly pstrictOr:      TermFn<[ PBool ], PBool>
    readonly strictOr:          ( other: PappArg<PBool> ) => TermBool

    readonly pand:           TermFn<[ PDelayed<PBool> ], PBool>
    readonly and:               ( other: PappArg<PBool> ) => TermBool

    readonly pstrictAnd:     TermFn<[ PBool ], PBool>
    readonly strictAnd:         ( other: PappArg<PBool> ) => TermBool

}

// avoid circular dependency
// is nothing fancy anyway
function pdelay<PInstance extends PType>(toDelay: Term<PInstance>): Term<PDelayed<PInstance>>
{
    return new Term(
        delayed( toDelay.type ),
        (dbn) => {
            return new IRDelayed(
                toDelay.toIR( dbn )
            );
        }
    );
}

const getterOnly = {
    set: () => {},
    configurable: false,
    enumerable: true
};

export function addPBoolMethods( term: Term<PBool> ): TermBool
{
    definePropertyIfNotPresent(
        term,
        "por",
        {
            get: () => por.$( term ),
            ...getterOnly
        }
    );
    defineReadOnlyProperty(
        term,
        "or",
        ( other: Term<PBool> | boolean ): TermBool =>
            por
            .$( term )
            .$( pdelay( 
                typeof other === "boolean" ? 
                pBool( other ) : other
            ))
    );

    definePropertyIfNotPresent(
        term,
        "pstrictOr",
        {
            get: () => pstrictOr.$( term ),
            ...getterOnly
        }
    );
    defineReadOnlyProperty(
        term,
        "strictOr",
        ( other: PappArg<PBool> ): TermBool => pstrictOr.$( term ).$( other )
    );


    definePropertyIfNotPresent(
        term,
        "pand",
        {
            get: () => pand.$( term ),
            ...getterOnly
        }
    );
    defineReadOnlyProperty(
        term,
        "and",
        ( other: Term<PBool> | boolean ): TermBool => 
            pand
            .$( term )
            .$( pdelay( 
                typeof other === "boolean" ? 
                pBool( other ) : other
            ))
    );

    definePropertyIfNotPresent(
        term,
        "pstrictAnd",
        {
            get: () => pstrictAnd.$( term ),
            ...getterOnly
        }
    );
    defineReadOnlyProperty(
        term,
        "strictAnd",
        ( other: PappArg<PBool> ): TermBool => pstrictAnd.$( term ).$( other )
    );

    return term as any;
}