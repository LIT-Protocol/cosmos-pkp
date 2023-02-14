"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pkpPubKeyToCosmosAddress_1 = require("./src/pkpPubKeyToCosmosAddress");
const ethPublicKey = '0x04e0fe6a5e9447112a272b3bfea3cbcb48a730c731d9edd434417d30f5b25966cb8543cece8ba67fd6bbbb9ba952e28db541de9a898cca0257e5479033c3b7b021';
const cosmosAddress = (0, pkpPubKeyToCosmosAddress_1.pkpPubKeyToCosmosAddress)(ethPublicKey);
console.log('Cosmos Address is: ', cosmosAddress);
//# sourceMappingURL=test.ts.map