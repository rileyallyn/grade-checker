import { AuthClient } from "./AuthClient";
import { ConnectBrightspaceOptions } from "./types";

class PulseBrightspaceAuth  extends AuthClient {
    async connectBrightspace(opts: ConnectBrightspaceOptions): Promise<void> {
        const { userId, orgBaseUrl } = opts;
        
    }
}