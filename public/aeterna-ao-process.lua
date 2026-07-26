-- ============================================================================
-- AETERNA SOVEREIGN VAULT - AO ARWEAVE PERMAWEB PROCESS CONTRACT (Lua)
-- Decentralized Actor Process for AO Computer on Arweave Mainnet
-- Process ID: ao_proc_aeterna_vault_v1_0x892a
-- ============================================================================

local json = require("json")

-- Process State Storage
VaultState = VaultState or {
    Title = "Aeterna Sovereign Vault",
    Owner = "ar_wallet_0x71c92a4f9a72b0c3d4e691",
    Version = "1.2.4",
    EncryptionStandard = "AES-GCM-256",
    CreatedBlock = 1482931,
    LastCheckInBlock = 1482935,
    DeadMansSwitchDays = 180,
    Status = "ARMED",
    PermawebRecords = {
        {
            TxId = "zvK_p2UWOEJpJu-uXHj8PMh14KgWfSZ7EvhAl3kjEmN",
            Title = "Ocean Retreat Family Heritage",
            Category = "Family",
            Timestamp = 1784950000000,
            EncryptedHash = "0x892a4f1092c8172b0"
        },
        {
            TxId = "BneABTd3voQQ2awBn8DIQ35-8oiDogV3neUDBDmwOWT",
            Title = "Grandfather Oral History Recording",
            Category = "Time Capsule",
            Timestamp = 1784950100000,
            EncryptedHash = "0x71b99c228a01f91c"
        }
    },
    Trustees = {
        { Name = "Elena Vance", Role = "Trustee", Wallet = "0x891A...31c", Verified = true },
        { Name = "Marcus Vance", Role = "Beneficiary", Wallet = "0x71B2...88f", Verified = true }
    }
}

-- Handler 1: Info & Health Check
Handlers.add(
    "Info",
    Handlers.utils.hasMatchingTag("Action", "Info"),
    function (msg)
        ao.send({
            Target = msg.From,
            Data = json.encode({
                Process = ao.id or "ao_proc_aeterna_vault_v1",
                Title = VaultState.Title,
                Owner = VaultState.Owner,
                Status = VaultState.Status,
                Encryption = VaultState.EncryptionStandard,
                RecordsCount = #VaultState.PermawebRecords,
                LastCheckInBlock = VaultState.LastCheckInBlock,
                GatewayUrl = "https://arweave.net/"
            })
        })
    end
)

-- Handler 2: Get Vault Records
Handlers.add(
    "GetVaultData",
    Handlers.utils.hasMatchingTag("Action", "GetVaultData"),
    function (msg)
        ao.send({
            Target = msg.From,
            Data = json.encode({
                Success = true,
                Owner = VaultState.Owner,
                Status = VaultState.Status,
                Records = VaultState.PermawebRecords,
                Trustees = VaultState.Trustees
            })
        })
    end
)

-- Handler 3: Record Heartbeat (Dead Man's Switch)
Handlers.add(
    "RecordHeartbeat",
    Handlers.utils.hasMatchingTag("Action", "RecordHeartbeat"),
    function (msg)
        if msg.From ~= VaultState.Owner and msg.From ~= "Owner" then
            ao.send({ Target = msg.From, Data = json.encode({ Error = "Unauthorized: Only Vault Owner can issue heartbeat" }) })
            return
        end
        VaultState.LastCheckInBlock = msg["Block-Height"] or 1482935
        VaultState.Status = "ARMED"
        ao.send({ Target = msg.From, Data = json.encode({ Success = true, Message = "Heartbeat recorded on AO Arweave ledger", Block = VaultState.LastCheckInBlock }) })
    end
)

-- Handler 4: Add Permaweb Record
Handlers.add(
    "AddPermawebRecord",
    Handlers.utils.hasMatchingTag("Action", "AddPermawebRecord"),
    function (msg)
        local payload = json.decode(msg.Data)
        if payload and payload.TxId then
            table.insert(VaultState.PermawebRecords, {
                TxId = payload.TxId,
                Title = payload.Title or "Untitled Memory",
                Category = payload.Category or "Personal",
                Timestamp = os.time() * 1000,
                EncryptedHash = payload.EncryptedHash or "0x0"
            })
            ao.send({ Target = msg.From, Data = json.encode({ Success = true, TxId = payload.TxId, Message = "Record added to AO Process state" }) })
        else
            ao.send({ Target = msg.From, Data = json.encode({ Error = "Invalid payload" }) })
        end
    end
)

print("Aeterna Sovereign Vault AO Process Initialized Successfully")
