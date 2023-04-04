import { NonNullableObject } from "@/helpers";
import {
  ProtocolParametersAlonzo,
  ProtocolParametersBabbage,
} from "@cardano-ogmios/schema";
import protocolParametersAlonzoJson from "./pparamsAlonzo.json";
import protocolParametersBabbageJson from "./pparamsBabbage.json";

export const protocolParametersAlonzo =
  protocolParametersAlonzoJson as unknown as NonNullableObject<ProtocolParametersAlonzo>;
export const protocolParametersBabbage =
  protocolParametersBabbageJson as unknown as NonNullableObject<ProtocolParametersBabbage>;
