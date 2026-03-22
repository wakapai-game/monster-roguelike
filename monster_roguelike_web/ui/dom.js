// ---- DOM Elements ----
export const screenStart = document.getElementById('screen-start');
export const screenStory = document.getElementById('screen-story');
export const screenEgg = document.getElementById('screen-egg');
export const screenMap = document.getElementById('screen-map');
export const screenSelection = document.getElementById('screen-selection');
export const screenBattle = document.getElementById('screen-battle');
export const screenName = document.getElementById('screen-name');
export const screenStarterEvent = document.getElementById('screen-starter-event');
export const screenHub = document.getElementById('screen-hub');
export const screenInventory = document.getElementById('screen-inventory');
export const screenReward = document.getElementById('screen-reward');
export const screenParty = document.getElementById('screen-party');
export const mainHeader = document.getElementById('main-header');

// Map Elements
export const mapNodesContainer = document.getElementById('map-nodes');
export const mapLinesContainer = document.getElementById('map-lines');

// Roster
export const rosterGrid = document.getElementById('roster-grid');
export const btnStartBattle = document.getElementById('btn-start-battle');

// Battle UI
export const battleLog = document.getElementById('battle-log');
export const actionMenu = document.getElementById('action-menu');
export const actionPhaseHeader = document.getElementById('action-phase-header');
export const actionTabs = document.getElementById('action-tabs');
export const defendWrapper = document.getElementById('defend-wrapper');
export const btnDefendAction = document.getElementById('btn-defend-action');
export const swapWrapper = document.getElementById('swap-wrapper');
export const btnSwapAction = document.getElementById('btn-swap-action');
export const swapSelectPanel = document.getElementById('swap-select-panel');
export const skillButtons = document.getElementById('skill-buttons');
export const itemButtons = document.getElementById('item-buttons');
export const btnTabSkills = document.getElementById('btn-tab-skills');
export const btnTabItems = document.getElementById('btn-tab-items');
export const itemCountBadge = document.getElementById('item-count-badge');
export const resultMenu = document.getElementById('battle-result-menu');
export const resultText = document.getElementById('battle-result-text');

// Inventory UI
export const btnHubInventory = document.getElementById('btn-hub-inventory');
export const btnMapInventory = document.getElementById('btn-map-inventory');
export const btnCloseInventory = document.getElementById('btn-close-inventory');
export const invSkillsContent = document.getElementById('inv-skills-content');
export const invFoodContent = document.getElementById('inv-food-content');
export const invTargetSelection = document.getElementById('inv-target-selection');
export const invRosterGrid = document.getElementById('inv-roster-grid');
export const invTargetMsg = document.getElementById('inv-target-msg');
export const btnCancelUse = document.getElementById('btn-cancel-use');

// Reward UI
export const btnCollectReward = document.getElementById('btn-collect-reward');

// Party UI
export const btnHubParty = document.getElementById('btn-hub-party');
export const btnMapParty = document.getElementById('btn-map-party');
export const btnCloseParty = document.getElementById('btn-close-party');
export const partyDetailsGrid = document.getElementById('party-details-grid');

// Name Input UI
export const inputPlayerName = document.getElementById('input-player-name');
export const btnSubmitName = document.getElementById('btn-submit-name');
export const starterEventGrid = document.getElementById('starter-event-grid');
export const btnStarterEventProceed = document.getElementById('btn-starter-event-proceed');

export const timelineQueue = document.getElementById('timeline-queue');
export const toastContainer = document.getElementById('toast-container');

export const p1FillHp = document.getElementById('p1-hp-fill');

// Stage UI
export const btnStage1 = document.getElementById('btn-stage-1');
export const btnStage2 = document.getElementById('btn-stage-2');
export const btnStage3 = document.getElementById('btn-stage-3');

// ---- Screen Transition ----
export function switchScreen(fromId, toId) {
  fromId.classList.remove('active');
  fromId.classList.add('hide');
  toId.classList.remove('hide');
  toId.classList.add('active');

  if (toId !== screenStart && toId !== screenStory && toId !== screenEgg && toId !== screenReward && toId !== screenName && toId !== screenStarterEvent && toId !== screenHub) {
    mainHeader.style.display = 'block';
  } else {
    mainHeader.style.display = 'none';
  }
}
