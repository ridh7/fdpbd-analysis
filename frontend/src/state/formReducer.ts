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
  | { type: "COLLAPSE_ALL" }
  | { type: "EXPAND_ALL" }
  | { type: "CLEAR" }
  | { type: "CLEAR_VALUES" };

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

const LENS_FIELDS = ["w_rms", "x_offset", "lens_transmittance", "detector_factor"] as const;
const MEDIUM_FIELDS = ["lambda_up", "eta_up", "c_up", "h_up"] as const;
const LASER_FIELDS = ["f_rolloff", "delay_1", "delay_2", "incident_pump", "incident_probe"] as const;

function detectPresetChange(
  field: string,
  newParams: IsotropicParams,
): { lensOption?: LensOption; mediumOption?: MediumOption; laserOption?: LaserOption } {
  const result: { lensOption?: LensOption; mediumOption?: MediumOption; laserOption?: LaserOption } = {};

  if ((LENS_FIELDS as readonly string[]).includes(field)) {
    const matchingPreset = (Object.entries(LENS_PRESETS) as [Exclude<LensOption, "custom">, Record<string, string>][])
      .find(([, preset]) => LENS_FIELDS.every((f) => newParams[f] === preset[f]));
    result.lensOption = matchingPreset ? matchingPreset[0] : "custom";
  }
  if ((MEDIUM_FIELDS as readonly string[]).includes(field)) {
    const matchingPreset = (Object.entries(MEDIUM_PRESETS) as [Exclude<MediumOption, "custom">, Record<string, string>][])
      .find(([, preset]) => MEDIUM_FIELDS.every((f) => newParams[f] === preset[f]));
    result.mediumOption = matchingPreset ? matchingPreset[0] : "custom";
  }
  if ((LASER_FIELDS as readonly string[]).includes(field)) {
    const matchingPreset = (Object.entries(LASER_PRESETS) as [Exclude<LaserOption, "custom">, Record<string, string>][])
      .find(([, preset]) => LASER_FIELDS.every((f) => newParams[f] === preset[f]));
    result.laserOption = matchingPreset ? matchingPreset[0] : "custom";
  }

  return result;
}

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_FIELD": {
      const newParams = { ...state.params, [action.field]: action.value };
      const presetChanges = detectPresetChange(action.field, newParams);
      return {
        ...state,
        ...presetChanges,
        params: newParams,
      };
    }

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

    case "COLLAPSE_ALL":
      return {
        ...state,
        collapsedSections: new Set([
          "lens", "detection", "laser", "medium", "transducer", "interface", "sample",
        ]),
      };

    case "EXPAND_ALL":
      return { ...state, collapsedSections: new Set<string>() };

    case "CLEAR":
      return { ...initialFormState, collapsedSections: new Set<string>() };

    case "CLEAR_VALUES": {
      const emptyParams: IsotropicParams = {
        f_rolloff: "", delay_1: "", delay_2: "",
        incident_pump: "", incident_probe: "",
        w_rms: "", x_offset: "", lens_transmittance: "", detector_factor: "",
        n_al: "", k_al: "",
        lambda_down: ["", "", ""], eta_down: ["", "", ""],
        c_down: ["", "", ""], h_down: ["", "", ""],
        niu: "", alpha_t: "",
        lambda_up: "", eta_up: "", c_up: "", h_up: "",
      };
      const emptyAniso: AnisotropicExtra = {
        phi: "", rho: "", alphaT: "",
        C11_0: "", C12_0: "", C44_0: "",
        lambda_down_x_sample: "", lambda_down_y_sample: "", lambda_down_z_sample: "",
        rho_sample: "",
        C11_0_sample: "", C12_0_sample: "", C13_0_sample: "",
        C33_0_sample: "", C44_0_sample: "",
        alphaT_perp: "", alphaT_para: "",
      };
      const emptyTransverse: TransverseExtra = {
        v_sum_fixed: "", c_probe: "", g_int: "",
      };
      return {
        ...state,
        params: emptyParams,
        anisotropicParams: emptyAniso,
        transverseParams: emptyTransverse,
        file: null,
        lensOption: "custom",
        mediumOption: "custom",
        laserOption: "custom",
      };
    }
  }
}
