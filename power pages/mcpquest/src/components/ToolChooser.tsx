import { PRODUCTS } from "@mcpquest/platform";

interface Props {
  disabled: boolean;
  busy: boolean;
  message: string | null;
  onChoose: (productId: string) => void;
}

/** The "which part of the Power Platform?" step, laid out like the maker portal's Create page. */
export function ToolChooser({ disabled, busy, message, onChoose }: Props) {
  return (
    <div className="chooser">
      <p className="flow-kicker">Create</p>
      <h4>Which part of the Power Platform fits this problem?</h4>
      <div className="product-grid" role="group" aria-label="Power Platform product">
        {PRODUCTS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="product"
            disabled={disabled || busy}
            onClick={() => onChoose(p.id)}
          >
            <span className="product-name">{p.name}</span>
            <span className="product-tag">{p.tagline}</span>
          </button>
        ))}
      </div>
      {message ? (
        <p className="chooser-message" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
