import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldSize = "md" | "num";

function fieldClass(size: FieldSize | undefined, className: string | undefined) {
  return ["ui-field", size === "num" ? "ui-field-num" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  fieldSize?: FieldSize;
};

/** Text / date / number input. Use `fieldSize="num"` for compact numeric targets. */
export function TextField({ fieldSize = "md", className, ...rest }: InputProps) {
  return <input className={fieldClass(fieldSize, className)} {...rest} />;
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  fieldSize?: FieldSize;
};

export function SelectField({ fieldSize = "md", className, children, ...rest }: SelectProps) {
  return (
    <select className={fieldClass(fieldSize, className)} {...rest}>
      {children}
    </select>
  );
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextAreaField({ className, ...rest }: TextAreaProps) {
  return <textarea className={fieldClass("md", className)} {...rest} />;
}
