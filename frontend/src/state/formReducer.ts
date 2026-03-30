import type {
  IsotropicParams,
  AnisotropicExtra,
  TransverseExtra,
} from "../schemas/params";
import type { LensOption, MediumOption, LaserOption } from "../constants/presets";
import type { AnalysisMode } from "../constants/defaults";
import {
  ISOTROPIC_DEFAULTS,
  ANISOTROPIC_DEFAULTS,
  TRANSVERSE_ANISO_DEFAULTS,
  TRANSVERSE_EXTRA_DEFAULTS,
} from "../constants/defaults";
import { LENS_PRESETS, MEDIUM_PRESETS, LASER_PRESETS } from "../constants/presets";

export interface FormState {
  analysisMode: AnalysisMode;
  params: IsotropicParams;
  anisotropicParams: AnisotropicExtra;
  transverseParams: TransverseExtra;
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
  | { type: "SET_ANISO_FIELD"; field: keyof AnisotropicExtra; value: string }
  | {
      type: "SET_TRANSVERSE_FIELD";
      field: keyof TransverseExtra;
      value: string;
    }
  | { type: "SET_MODE"; mode: AnalysisMode }
  | { type: "SET_FILE"; file: File | null }
  | { type: "SET_LENS_OPTION"; option: LensOption }
  | { type: "SET_MEDIUM_OPTION"; option: MediumOption }
  | { type: "SET_LASER_OPTION"; option: LaserOption }
  | { type: "TOGGLE_SECTION"; section: string }
  | { type: "CLEAR" };

export const initialFormState: FormState = {
  analysisMode: "isotropic",
  params: ISOTROPIC_DEFAULTS,
  anisotropicParams: ANISOTROPIC_DEFAULTS,
  transverseParams: TRANSVERSE_EXTRA_DEFAULTS,
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

    case "SET_ANISO_FIELD":
      return {
        ...state,
        anisotropicParams: {
          ...state.anisotropicParams,
          [action.field]: action.value,
        },
      };

    case "SET_TRANSVERSE_FIELD":
      return {
        ...state,
        transverseParams: {
          ...state.transverseParams,
          [action.field]: action.value,
        },
      };

    case "SET_MODE": {
      // When switching to transverse, apply transverse-specific aniso defaults
      if (action.mode === "transverse_isotropic") {
        return {
          ...state,
          analysisMode: action.mode,
          anisotropicParams: TRANSVERSE_ANISO_DEFAULTS,
        };
      }
      // When switching to anisotropic, restore anisotropic defaults
      if (
        action.mode === "anisotropic" &&
        state.analysisMode === "transverse_isotropic"
      ) {
        return {
          ...state,
          analysisMode: action.mode,
          anisotropicParams: ANISOTROPIC_DEFAULTS,
        };
      }
      return { ...state, analysisMode: action.mode };
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
