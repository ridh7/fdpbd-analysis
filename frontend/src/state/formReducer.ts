import type { IsotropicParams } from "../schemas/params";
import type { LensOption, MediumOption, LaserOption } from "../constants/presets";
import { ISOTROPIC_DEFAULTS } from "../constants/defaults";
import { LENS_PRESETS, MEDIUM_PRESETS, LASER_PRESETS } from "../constants/presets";

export interface FormState {
  params: IsotropicParams;
  file: File | null;
  lensOption: LensOption;
  mediumOption: MediumOption;
  laserOption: LaserOption;
  collapsedSections: Set<string>;
}

export type FormAction =
  | { type: "SET_FIELD"; field: keyof IsotropicParams; value: string }
  | {
      type: "SET_ARRAY_FIELD";
      field: "lambda_down" | "eta_down" | "c_down" | "h_down";
      index: number;
      value: string;
    }
  | { type: "SET_FILE"; file: File | null }
  | { type: "SET_LENS_OPTION"; option: LensOption }
  | { type: "SET_MEDIUM_OPTION"; option: MediumOption }
  | { type: "SET_LASER_OPTION"; option: LaserOption }
  | { type: "TOGGLE_SECTION"; section: string }
  | { type: "CLEAR" };

export const initialFormState: FormState = {
  params: ISOTROPIC_DEFAULTS,
  file: null,
  lensOption: "5x",
  mediumOption: "air",
  laserOption: "TOPS 1",
  collapsedSections: new Set<string>(),
};

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_FIELD":
      return {
        ...state,
        params: { ...state.params, [action.field]: action.value },
      };

    case "SET_ARRAY_FIELD": {
      const arr = [...state.params[action.field]] as [string, string, string];
      arr[action.index] = action.value;
      return {
        ...state,
        params: { ...state.params, [action.field]: arr },
      };
    }

    case "SET_FILE":
      return { ...state, file: action.file };

    case "SET_LENS_OPTION": {
      if (action.option === "custom") {
        return { ...state, lensOption: "custom" };
      }
      const preset = LENS_PRESETS[action.option];
      return {
        ...state,
        lensOption: action.option,
        params: { ...state.params, ...preset },
      };
    }

    case "SET_MEDIUM_OPTION": {
      if (action.option === "custom") {
        return { ...state, mediumOption: "custom" };
      }
      const preset = MEDIUM_PRESETS[action.option];
      return {
        ...state,
        mediumOption: action.option,
        params: { ...state.params, ...preset },
      };
    }

    case "SET_LASER_OPTION": {
      if (action.option === "custom") {
        return { ...state, laserOption: "custom" };
      }
      const preset = LASER_PRESETS[action.option];
      return {
        ...state,
        laserOption: action.option,
        params: { ...state.params, ...preset },
      };
    }

    case "TOGGLE_SECTION": {
      const next = new Set(state.collapsedSections);
      if (next.has(action.section)) {
        next.delete(action.section);
      } else {
        next.add(action.section);
      }
      return { ...state, collapsedSections: next };
    }

    case "CLEAR":
      return { ...initialFormState, collapsedSections: new Set<string>() };
  }
}
