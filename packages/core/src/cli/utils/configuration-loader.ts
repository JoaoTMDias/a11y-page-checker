import { readFileSync } from "fs";
import { parse } from "yaml";

class ConfigurationLoader {
  constructor() {}

  public load(configPath: string) {
    const config = readFileSync(configPath, "utf8");

    try {
      if (configPath.endsWith(".yml") || configPath.endsWith(".yaml")) {
        return parse(config);
      }

      if (configPath.endsWith(".json")) {
        return JSON.parse(config);
      }
    } catch (error) {
      throw new Error(`Failed to parse configuration file: ${configPath}`);
    }
  }
}

export default ConfigurationLoader;
