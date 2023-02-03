import ObjectUtils from "../../../../utils/ObjectUtils";
import { PType, Term, PPair } from "../..";
import { BasePlutsError } from "../../../../errors/BasePlutsError";
import { isConstantableTermType, isPairType } from "../../Term/Type/kinds";
import { pfstPair, psndPair } from "../Builtins";
import { UtilityTermOf } from "./addUtilityForType";


export type TermPair<PFst extends PType, PSnd extends PType> = Term<PPair<PFst,PSnd>> & {

    readonly fst: UtilityTermOf<PFst>

    readonly snd: UtilityTermOf<PSnd>
    
}

export function addPPairMethods<PFst extends PType, PSnd extends PType>( pair: Term<PPair<PFst,PSnd>>)
{
    const pairT = pair.type;

    if( !isPairType( pairT ) )
    {
        throw new BasePlutsError(
            "can't add pair methods to a term that is not a pair"
        );
    };

    const fstT =  pairT[1];
    const sndT = pairT[2];

    if( isConstantableTermType( fstT ) )
        ObjectUtils.defineReadOnlyProperty(
            pair,
            "fst",
            pfstPair( fstT, sndT ).$( pair )
        );
    if( isConstantableTermType( sndT ) )
        ObjectUtils.defineReadOnlyProperty(
            pair,
            "snd",
            psndPair( fstT, sndT ).$( pair )
        );

    return pair as any;
}