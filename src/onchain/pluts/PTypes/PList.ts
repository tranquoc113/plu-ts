import JsRuntime from "../../../utils/JsRuntime";
import { Data, isData } from "../../../types/Data";
import { constT } from "../../UPLC/UPLCTerms/UPLCConst/ConstType";
import { Type, TermType, ConstantableTermType, list } from "../Term/Type/base";
import { pListToData, pnilData, pnilPairData, pprepend, punListData } from "../stdlib/Builtins";
import { TermList, addPListMethods } from "../stdlib/UtilityTerms/TermList";
import { PType } from "..";
import { termTyToConstTy } from "../Term/Type/constTypeConversion";
import { typeExtends } from "../Term/Type/extension";
import { ToPType } from "../Term/Type/ts-pluts-conversion";
import { isConstantableTermType } from "../Term/Type/kinds";
import { PappArg } from "../Syntax/pappArg";
import { UPLCConst } from "../../UPLC/UPLCTerms/UPLCConst";
import { Term } from "../Term";
import { PData } from "./PData/PData";
import { PDataList } from "./PData/PDataList";
import { PLam } from "./PFn/PLam";
import { punsafeConvertType } from "../Syntax/punsafeConvertType";
import { PDataRepresentable } from "../PType/PDataRepresentable";

//@ts-ignoreType instantiation is excessively deep and possibly infinite
export class PList<A extends PType> extends PDataRepresentable
{
    private _elems: A[];

    constructor( elements: A[] = [] )
    {
        super();

        this._elems = elements
    }

    static override get termType(): TermType { return Type.List( Type.Any )}
    
    static override get fromDataTerm(): Term<PLam<PData, PList<PData>>> & { $: (input: PappArg<PData>) => Term<PList<PData>>; }
    {
        //@ts-ignoreType instantiation is excessively deep and possibly infinite
        return punListData( Type.Data.Any );
    }
    /**
     * @deprecated try to use 'fromDataTerm.$'
     */
    static override get fromData(): (data: Term<PData>) => Term<PList<PData>>
    {
        return (data: Term<PData>) => punListData( Type.Data.Any ).$( data );
    }

    static override get toDataTerm():Term<PLam<any, PData>> & { $: (input: PappArg<any>) => Term<PData>; }
    {
        //@ts-ignoreType instantiation is excessively deep and possibly infinite
        return pListToData( Type.Data.Any ) as any;
    }
    /**
     * @deprecated try to use 'toDataTerm.$'
     */
    static override toData(term: Term<PList<PData>>): Term<PDataList<PData>>
    {
        return pListToData( Type.Data.Any ).$( term )
    }
}

function assertValidListType( elemsT: ConstantableTermType ): void
{
    JsRuntime.assert(
        isConstantableTermType( elemsT ),
        "plutus only supports lists of types that can be converted to constants"
    );
}

export function pnil<ElemsT extends ConstantableTermType>( elemsT: ElemsT ): TermList<ToPType<ElemsT>>
{
    assertValidListType( elemsT );

    if( typeExtends( elemsT, Type.Data.Any ) )
    {
        if( typeExtends( elemsT, Type.Data.Pair( Type.Data.Any, Type.Data.Any ) ) )
            return punsafeConvertType( pnilPairData, list( elemsT ) ) as any;
        return punsafeConvertType( pnilData, list( elemsT ) ) as any;
    }

    return addPListMethods(
        new Term<PList<ToPType<ElemsT>>>(
            Type.List( elemsT ),
            _dbn => UPLCConst.listOf( termTyToConstTy( elemsT ) )([]),
            true
        )
    );
}

export function pconstList<ElemsT extends ConstantableTermType>( elemsT: ElemsT ): ( elems: Term<ToPType<ElemsT>>[] ) => TermList<ToPType<ElemsT>>
{
    assertValidListType( elemsT );

    return ( elems: Term<ToPType<ElemsT>>[] ): TermList<ToPType<ElemsT>> => {
        JsRuntime.assert(
            Array.isArray( elems ) && elems.every(
                el => 
                    el instanceof Term &&
                    (el as any).isConstant &&
                    typeExtends( el.type, elemsT )
            ),
            "invalid array of elements to construct a list with"
        );

        if( elems.length === 0 ) return pnil( elemsT );

        return addPListMethods(
            new Term<PList<ToPType<ElemsT>>>(
                Type.List( elemsT ),
                dbn => UPLCConst.listOf( termTyToConstTy( elemsT ) )
                    ( 
                        elems.map(
                            el => ( el.toUPLC( dbn ) as UPLCConst ).value
                        ) as any
                    ),
                true
            )
        );
    }
}

export function pList<ElemsT extends ConstantableTermType>( elemsT: ElemsT ): ( elems: Term<ToPType<ElemsT>>[] ) => TermList<ToPType<ElemsT>>
{
    return ( elems: Term<ToPType<ElemsT>>[] ): TermList<ToPType<ElemsT>> => {
        JsRuntime.assert(
            Array.isArray( elems ) && elems.every(
                el => 
                    el instanceof Term &&
                    typeExtends( el.type, elemsT )
            ),
            "invalid array of elements to construct a list with"
        );

        let nConstantFromEnd = 0;

        for(let i = elems.length - 1; i >= 0; i--)
        {
            if( (elems[i] as any).isConstant ) nConstantFromEnd++;
            else break;
        }

        /**
         * if nConstantFromEnd === 0 
         * 
         * ```ts
         * elems.slice( elems.length - nConstantFromEnd )
         * ```
         * 
         * evalueates to ```[]```
         * 
         * which makes calling 
         * 
         * ```ts
         * pconstList( elemsT )([])
         * ```
         * 
         * equivalent to
         * 
         * ```ts
         * pnil( elemsT )
         * ```
         */
        let plist = pconstList( elemsT )( elems.slice( elems.length - nConstantFromEnd ) );

        // all the elements where constants
        if( nConstantFromEnd === elems.length ) return plist;

        for( let i = elems.length - nConstantFromEnd - 1; i >= 0; i-- )
        {

            plist =
                //@ts-ignoreType instantiation is excessively deep and possibly infinite
                pprepend( elemsT )
                .$( elems[i] ).$( plist );
        }

        return plist;
    }
}

export function pDataList( datas: Data[] ): Term<PList<PData>>
{
    JsRuntime.assert(
        Array.isArray( datas ) && datas.every( isData ),
        "invalid list of data passed to 'pDataList'"
    );

    return new Term(
        Type.List( Type.Data.Any ),
        _dbn => UPLCConst.listOf( constT.data )( datas ),
        true
    );
}