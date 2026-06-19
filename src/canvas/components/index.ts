import { registerComponent } from "./registry";
import { frameDef } from "./frame";
import { tableDef } from "./table";
import { codeDef } from "./code";

registerComponent(frameDef);
registerComponent(tableDef);
registerComponent(codeDef);
