import type { PatientAttributes } from "@/types/patient";

type PatientFormValues = {
  [Field in keyof PatientAttributes]: string;
};

const patientFields: { name: keyof PatientFormValues; label: string; type: string }[] = [
  { name: "first_name", label: "First name", type: "text" },
  { name: "last_name", label: "Last name", type: "text" },
  { name: "phone", label: "Phone", type: "tel" },
  { name: "city", label: "City", type: "text" },
];

type PatientFieldsProps = {
  values: PatientFormValues;
  onChange: (field: keyof PatientFormValues, value: string) => void;
  disabled?: boolean;
};

export default function PatientFields({
  values,
  onChange,
  disabled = false,
}: PatientFieldsProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {patientFields.map((field) => (
        <label
          key={field.name}
          className="space-y-2 text-sm font-medium text-slate-700"
        >
          {field.label}
          <input
            type={field.type}
            name={field.name}
            value={values[field.name]}
            onChange={(event) => onChange(field.name, event.target.value)}
            required
            disabled={disabled}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-50"
          />
        </label>
      ))}
    </div>
  );
}
