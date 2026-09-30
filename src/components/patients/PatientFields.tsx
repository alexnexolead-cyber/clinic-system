import type { PatientAttributes } from "@/types/patient";
import {
  isAllowedPakistanCity,
  pakistanCities,
  sanitizePakistanPhone,
  sanitizePersonName,
} from "@/lib/patient-validation";

type PatientFormValues = {
  [Field in keyof PatientAttributes]: string;
};

const patientFields: { name: "first_name" | "last_name" | "phone"; label: string; type: string }[] = [
  { name: "first_name", label: "First name", type: "text" },
  { name: "last_name", label: "Last name", type: "text" },
  { name: "phone", label: "Phone", type: "tel" },
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
            inputMode={field.name === "phone" ? "tel" : undefined}
            autoComplete={field.name === "first_name" ? "given-name" : field.name === "last_name" ? "family-name" : "tel"}
            maxLength={field.name === "phone" ? 24 : 60}
            onChange={(event) => onChange(
              field.name,
              field.name === "phone"
                ? sanitizePakistanPhone(event.target.value)
                : sanitizePersonName(event.target.value),
            )}
            required
            disabled={disabled}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-50"
          />
        </label>
      ))}
      <label className="space-y-2 text-sm font-medium text-slate-700">
        City
        <select
          value={values.city}
          onChange={(event) => onChange("city", event.target.value)}
          required
          disabled={disabled}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-50"
        >
          <option value="" disabled>Select city</option>
          {pakistanCities.map((city) => <option key={city} value={city}>{city}</option>)}
          {values.city && !isAllowedPakistanCity(values.city) && (
            <option value={values.city}>{values.city}</option>
          )}
        </select>
      </label>
    </div>
  );
}
