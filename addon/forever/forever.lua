--[[ flavor/forever.lua -------------------------------------------------------
  WoW: Forever (internal game type: Camelot) compatibility shim.

  The Midnight-packaged addon is already the right codebase: Forever shares
  Mainline's UI architecture and most of the 12.1.x API. What it does not
  share is the interface number (Forever beta is 16001, Midnight is 120100)
  or, on some builds, the auction-house and profession frame names.

  This file is loaded only from WGFCompanion_Camelot.toc, which the Windows
  client stamps into an installed copy. It must stay safe on any client: if
  a frame, API, or module is missing we no-op, we never throw.
----------------------------------------------------------------------------- ]]

local ADDON_NAME, WGF = ...

WGF.isForever = true
WGF.gameType  = "camelot"

local function exists(name)
    local f = rawget(_G, name)
    return type(f) == "table" and f or nil
end

local function shown(frame)
    return frame ~= nil and frame.IsShown ~= nil and frame:IsShown() and true or false
end

-- ---------------------------------------------------------------------------
-- Auction house: Forever may still expose the classic AuctionFrame even when
-- C_AuctionHouse exists. The Midnight path only asked AuctionHouseFrame.
-- ---------------------------------------------------------------------------
if WGF.API then
    WGF.API.isForever = true
    local originalOpen = WGF.API.IsAuctionHouseOpen
    function WGF.API.IsAuctionHouseOpen()
        if originalOpen and originalOpen() then return true end
        return shown(exists("AuctionFrame"))
    end
end

-- ---------------------------------------------------------------------------
-- Dock hosts: keep the Midnight frames, and also sit beside the classic
-- auction and trade-skill windows when those are the ones that actually open.
-- Patron orders are a Dragonflight-era surface; hide that tab when the
-- crafting-order API is not on this build so the dock is not an empty board.
-- ---------------------------------------------------------------------------
local Dock = WGF.Dock
if Dock and Dock.KINDS then
    local function addHost(kind, name)
        local spec = Dock.KINDS[kind]
        if not spec or type(spec.hosts) ~= "table" then return end
        for _, existing in ipairs(spec.hosts) do
            if existing == name then return end
        end
        spec.hosts[#spec.hosts + 1] = name
    end

    addHost("ah", "AuctionHouseFrame")
    addHost("ah", "AuctionFrame")
    addHost("craft", "ProfessionsFrame")
    addHost("craft", "TradeSkillFrame")
    addHost("craft", "CraftFrame")

    local hasOrders = C_CraftingOrders
        and type(C_CraftingOrders.GetCrafterOrders) == "function"
    if not hasOrders and Dock.KINDS.craft then
        Dock.KINDS.craft.sub  = "professions"
        Dock.KINDS.craft.nav  = { "Settings", "Info" }
        Dock.KINDS.craft.land = "Settings"
    end
end

-- ---------------------------------------------------------------------------
-- One line in chat so a Forever player can tell the shim actually loaded.
-- Registered as a module so it runs after the rest of the addon is up.
-- ---------------------------------------------------------------------------
local M = {}
function M:OnEnable()
    local ah = (C_AuctionHouse and "C_AuctionHouse") or "classic AuctionFrame"
    WGF:Print("Forever client: using " .. ah
        .. ". Prices in tooltips stay live; open the auction house for the dock.")
end
WGF:RegisterModule("Forever", M)
