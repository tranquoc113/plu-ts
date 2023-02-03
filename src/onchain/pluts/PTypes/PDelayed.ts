import { Cloneable, isCloneable } from "../../../types/interfaces/Cloneable";
import { Type, TermType } from "../Term/Type/base";
import { PType } from "../PType";

export class PDelayed< DelayedPType extends PType > extends PType
    implements Cloneable<PDelayed<DelayedPType>>
{
    private _delayedPType: DelayedPType;

    constructor( toDelay: DelayedPType = new PType as DelayedPType )
    {
        super();
        this._delayedPType = toDelay;
    }

    clone(): PDelayed<DelayedPType>
    {
        return new PDelayed(
            isCloneable( this._delayedPType ) ? 
                this._delayedPType.clone() : 
                this._delayedPType
        );
    }

    static override get termType(): TermType { return Type.Delayed( Type.Any ) }
}