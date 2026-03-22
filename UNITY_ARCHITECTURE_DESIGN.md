# Monster Roguelike - Unity Architecture Design Document

**Project:** Monster Roguelike Port to Unity
**Date:** March 22, 2026
**Status:** Initial Architecture Specification

---

## Executive Summary

This document provides a complete architectural blueprint for porting Monster Roguelike from the web (JavaScript) and Python implementations to Unity. The design maintains game systems fidelity while adapting to Unity's paradigms.

**Key Design Decisions:**
- Pure C# domain classes (Monster, Skill, Timeline) — not MonoBehaviours
- ScriptableObject templates for data (Monster definitions, Skills)
- Coroutine-based ATB timeline with Update() for gauge progression
- Event-driven architecture for UI feedback
- Application.persistentDataPath for save/load (vs PlayerPrefs)

---

## 1. Class Structure Mapping

### 1.1 Monster Class (Domain Model)

**JavaScript:** `Monster` (data + live state)
**Python:** `Monster` (with parameter-based stat calculation)

**Unity Implementation:** Pure C# class (non-MonoBehaviour)

```csharp
// Assets/Scripts/Core/Monster.cs
public class Monster
{
    // Identity
    public string id;
    public string name;

    // Elements (8-element system: fire, water, ice, thunder, earth, wind, light, dark, none)
    public ElementType mainElement;
    public ElementType subElement;

    // Base stats (template data)
    public MonsterStats baseStats;

    // Growth parameters (sum to ~150: size, hardness, intelligence)
    public GrowthParams params;

    // Skills available to this monster
    public List<string> skillIds;

    // Growth log (last 50 items)
    public List<GrowthLogEntry> growthLog;

    // Runtime state
    public MonsterStats stats; // final calculated stats
    public int currentHp;
    public int currentSt;
    public float gauge; // 0.0 to 100.0 (ATB timeline)
    public bool isBreak; // ST <= 0 state

    // Constructor
    public Monster(MonsterTemplate template)
    {
        id = template.id;
        name = template.name;
        mainElement = template.mainElement;
        subElement = template.subElement;
        baseStats = template.baseStats.Clone();
        params = template.params.Clone();
        skillIds = new List<string>(template.skillIds);
        growthLog = new List<GrowthLogEntry>();

        RecalculateStats();
        currentHp = stats.hp;
        currentSt = stats.maxSt;
        gauge = 0f;
        isBreak = false;
    }

    // Calculate final stats from base + growth params
    public void RecalculateStats()
    {
        stats = CalculateFinalStats(baseStats, params);
        if (currentHp > stats.hp) currentHp = stats.hp;
        if (currentSt > stats.maxSt) currentSt = stats.maxSt;
    }

    private MonsterStats CalculateFinalStats(MonsterStats baseStats, GrowthParams p)
    {
        // Python implementation: size, hardness, intelligence modifiers
        // Example: hp = base_hp * (1 + (size - 50) / 100)
        var stats = new MonsterStats();
        stats.hp = Mathf.Max(1, Mathf.FloorToInt(baseStats.hp * (1f + (p.size - 50) / 100f)));
        stats.atk = Mathf.Max(1, Mathf.FloorToInt(baseStats.atk * (1f + (p.size - 50) / 100f * 0.8f)));
        stats.def = Mathf.Max(1, Mathf.FloorToInt(baseStats.def * (1f + (p.hardness - 50) / 100f)));
        stats.mag = Mathf.Max(1, Mathf.FloorToInt(baseStats.mag * (1f + (p.intelligence - 50) / 100f)));
        stats.spd = Mathf.Max(1, Mathf.FloorToInt(baseStats.spd * (1f - (p.size - 50) / 100f * 0.5f)));
        stats.maxSt = Mathf.Max(1, Mathf.FloorToInt(baseStats.maxSt * (1f + (p.hardness - 50) / 100f * 0.5f)));
        stats.stRec = baseStats.stRec;
        return stats;
    }

    public void ApplyGrowthItem(string itemId, string paramName, int delta)
    {
        int before = params.Get(paramName);
        int after = before + delta;
        params.Set(paramName, after);

        growthLog.Add(new GrowthLogEntry
        {
            itemId = itemId,
            param = paramName,
            before = before,
            after = after,
            timestamp = System.DateTime.Now
        });

        if (growthLog.Count > 50)
            growthLog.RemoveRange(0, growthLog.Count - 50);

        RecalculateStats();
    }

    // Serialization for save/load
    public MonsterData ToData()
    {
        return new MonsterData
        {
            id = this.id,
            name = this.name,
            mainElement = this.mainElement.ToString(),
            subElement = this.subElement.ToString(),
            baseStats = this.baseStats,
            @params = this.params,
            skillIds = this.skillIds,
            growthLog = this.growthLog
        };
    }
}

public class MonsterStats
{
    public int hp;
    public int atk;
    public int def;
    public int mag;
    public int spd;
    public int maxSt;
    public int stRec;

    public MonsterStats Clone() => new MonsterStats
    {
        hp = this.hp, atk = this.atk, def = this.def, mag = this.mag,
        spd = this.spd, maxSt = this.maxSt, stRec = this.stRec
    };
}

public class GrowthParams
{
    public int size; // affects hp, atk (-), spd (-)
    public int hardness; // affects def, maxSt, mag (-)
    public int intelligence; // affects mag, stRec, atk (-)

    public int Get(string name) => name switch
    {
        "size" => size,
        "hardness" => hardness,
        "intelligence" => intelligence,
        _ => 0
    };

    public void Set(string name, int value)
    {
        switch(name)
        {
            case "size": size = value; break;
            case "hardness": hardness = value; break;
            case "intelligence": intelligence = value; break;
        }
    }

    public GrowthParams Clone() => new GrowthParams
    {
        size = this.size,
        hardness = this.hardness,
        intelligence = this.intelligence
    };
}

public class GrowthLogEntry
{
    public string itemId;
    public string param;
    public int before;
    public int after;
    public System.DateTime timestamp;
}
```

### 1.2 Skill Class (Data Reference)

**Unity Implementation:** ScriptableObject template + runtime reference

```csharp
// Assets/Scripts/Models/Skill.cs
[System.Serializable]
public class Skill
{
    public string id;
    public string name;
    public SkillCategory category; // attack, defense, trap, heal
    public SkillType type; // physical, magic, pierce, trap
    public ElementType element;
    public int costSt;
    public List<SkillEffect> effects;

    [System.Serializable]
    public class SkillEffect
    {
        public SkillEffectType type; // damage_st, damage_hp_direct, recover_st, recover_hp, delay_gauge, add_status
        public int basePower;
        public int value;
        public float percent;
    }
}

public enum SkillCategory { Attack, Defense, Trap, Heal }
public enum SkillType { Physical, Magic, Pierce, Trap, Buff, Heal }
public enum SkillEffectType { DamageSt, DamageHpDirect, RecoverSt, RecoverHp, DelayGauge, AddStatus }
public enum ElementType { Fire, Water, Ice, Thunder, Earth, Wind, Light, Dark, None }
```

### 1.3 BattleEngine (Stateless Service)

**JavaScript:** `BattleEngine` instance created per battle
**Python:** `BattleEngine(data_loader)` dependency injection

**Unity Implementation:** Static class or Singleton manager with dependency injection

```csharp
// Assets/Scripts/Core/BattleEngine.cs
public static class BattleEngine
{
    private static DataManager dataManager;

    public static void Initialize(DataManager dm) => dataManager = dm;

    public static BattleResult ExecuteSkill(Monster attacker, Monster defender, string skillId)
    {
        var skill = dataManager.GetSkill(skillId);
        if (skill == null) return new BattleResult { error = "Skill not found" };

        var result = new BattleResult
        {
            attackerName = attacker.name,
            defenderName = defender.name,
            skillName = skill.name,
            stDamage = 0,
            hpDamage = 0,
            armorCrush = false,
            isBreak = false,
            selfDamage = 0
        };

        // ST cost (or HP damage if in break state)
        int cost = skill.costSt;
        if (attacker.isBreak)
        {
            attacker.currentHp -= cost;
            result.selfDamage = cost;
        }
        else
        {
            attacker.currentSt = Mathf.Max(0, attacker.currentSt - cost);
            if (attacker.currentSt == 0)
                attacker.isBreak = true;
        }

        // Baseline incoming attack penalty
        if (attacker.id != defender.id && (skill.category == SkillCategory.Attack || skill.category == SkillCategory.Trap))
        {
            int penalty = 10;
            if (defender.isBreak)
            {
                defender.currentHp -= penalty;
                result.hpDamage += penalty;
            }
            else
            {
                int actualStDmg = Mathf.Min(defender.currentSt, penalty);
                defender.currentSt -= actualStDmg;
                result.stDamage += actualStDmg;

                if (defender.currentSt == 0)
                {
                    defender.isBreak = true;
                    result.isBreak = true;
                }
            }
        }

        // Process skill effects
        foreach (var effect in skill.effects)
        {
            switch(effect.type)
            {
                case SkillEffectType.DamageSt:
                    var dmg = CalculateStDamage(attacker, defender, skill, effect);
                    defender.currentSt -= dmg.stDamage;
                    result.stDamage += dmg.stDamage;
                    result.armorCrush = result.armorCrush || dmg.armorCrush;

                    if (defender.currentSt <= 0)
                    {
                        defender.currentSt = 0;
                        defender.isBreak = true;
                        result.isBreak = true;
                    }
                    break;

                case SkillEffectType.DamageHpDirect:
                    int dmgHp = effect.basePower;
                    if (defender.isBreak) dmgHp = Mathf.FloorToInt(dmgHp * 2f);
                    defender.currentHp -= dmgHp;
                    result.hpDamage += dmgHp;
                    break;

                case SkillEffectType.DelayGauge:
                    defender.gauge = Mathf.Max(0, defender.gauge - effect.value);
                    break;

                case SkillEffectType.RecoverSt:
                    int recover = Mathf.FloorToInt(attacker.stats.maxSt * (effect.percent / 100f)) + attacker.stats.stRec;
                    attacker.currentSt = Mathf.Min(attacker.stats.maxSt, attacker.currentSt + recover);
                    if (attacker.currentSt > 0 && attacker.isBreak)
                        attacker.isBreak = false;
                    break;

                case SkillEffectType.RecoverHp:
                    defender.currentHp = Mathf.Min(defender.stats.hp, defender.currentHp + effect.value);
                    break;
            }
        }

        defender.currentHp = Mathf.Max(0, defender.currentHp);
        attacker.currentHp = Mathf.Max(0, attacker.currentHp);

        return result;
    }

    private static DamageResult CalculateStDamage(Monster attacker, Monster defender, Skill skill, Skill.SkillEffect effect)
    {
        int basePower = effect.basePower;
        bool isPhysical = (skill.type == SkillType.Physical);

        int atkStat = isPhysical ? attacker.stats.atk : attacker.stats.mag;
        int defStat = isPhysical ? defender.stats.def : defender.stats.mag;

        float multiMain = GetAffinityMultiplier(skill.element, defender.mainElement);
        float multiSub = GetAffinityMultiplier(skill.element, defender.subElement);

        float affinityMult = multiMain * multiSub;
        if (multiMain > 1f && multiSub > 1f) affinityMult = 4f;

        float rawDamage = basePower * (atkStat / (float)Mathf.Max(1, defStat)) * affinityMult;

        // BREAK state: convert to HP damage
        if (defender.isBreak)
        {
            float hpMult = 2f;
            if (affinityMult == 4f) hpMult = 8f;
            else if (affinityMult > 1f) hpMult = affinityMult * 2f;

            defender.currentHp -= Mathf.FloorToInt(rawDamage * hpMult);
            return new DamageResult { stDamage = 0, armorCrush = false };
        }

        // Armor crush check
        bool armorCrush = false;
        float crushThreshold = defStat * defender.currentSt;
        float crushPower = basePower * atkStat;

        if (crushPower > crushThreshold)
        {
            armorCrush = true;
            rawDamage *= 2f;
        }

        return new DamageResult
        {
            stDamage = Mathf.FloorToInt(rawDamage),
            armorCrush = armorCrush
        };
    }

    private static float GetAffinityMultiplier(ElementType atkElem, ElementType defElem)
    {
        var affinity = dataManager.GetAffinity(atkElem, defElem);
        return affinity ?? 1f;
    }
}

public class BattleResult
{
    public string error;
    public string attackerName;
    public string defenderName;
    public string skillName;
    public int stDamage;
    public int hpDamage;
    public bool armorCrush;
    public bool isBreak;
    public int selfDamage;
}

public class DamageResult
{
    public int stDamage;
    public bool armorCrush;
}
```

### 1.4 ATB Timeline (Gauge-Based Ordering)

**JavaScript:** `Timeline` with synchronous `tick()` loop
**Unity Implementation:** Coroutine-based with Update() gauge increment

```csharp
// Assets/Scripts/Core/ATBTimeline.cs
public class ATBTimeline
{
    private const float GAUGE_MAX = 100f;

    private List<Monster> p1Team;
    private List<Monster> p2Team;
    public Monster p1Active { get; private set; }
    public Monster p2Active { get; private set; }

    public System.Action<TimelineTickResult> OnTick; // UI feedback

    public ATBTimeline(List<Monster> p1Team, List<Monster> p2Team)
    {
        this.p1Team = p1Team;
        this.p2Team = p2Team;
        this.p1Active = p1Team.Count > 0 ? p1Team[0] : null;
        this.p2Active = p2Team.Count > 0 ? p2Team[0] : null;

        foreach (var m in p1Team.Concat(p2Team))
            m.gauge = 0f;
    }

    // Called from GameLoop.Update()
    public TimelineTickResult Tick(float deltaTime)
    {
        // Increment gauge based on SPD (Time.deltaTime * spd / 100 = ~realistic scaling)
        if (p1Active != null && p1Active.currentHp > 0)
            p1Active.gauge += deltaTime * p1Active.stats.spd / 100f * GAUGE_MAX;

        if (p2Active != null && p2Active.currentHp > 0)
            p2Active.gauge += deltaTime * p2Active.stats.spd / 100f * GAUGE_MAX;

        // Check for ready monsters
        if (p1Active != null && p1Active.gauge >= GAUGE_MAX)
            return new TimelineTickResult { player = 1, actor = p1Active };

        if (p2Active != null && p2Active.gauge >= GAUGE_MAX)
            return new TimelineTickResult { player = 2, actor = p2Active };

        return null; // No one is ready yet
    }

    public void OnActionCompleted(int playerNum)
    {
        var active = playerNum == 1 ? p1Active : p2Active;
        var team = playerNum == 1 ? p1Team : p2Team;

        if (active != null)
            active.gauge -= GAUGE_MAX;

        // ST recovery for bench monsters (5% of max_st)
        foreach (var m in team)
        {
            if (m != active && m.currentHp > 0)
            {
                int recovery = Mathf.FloorToInt(m.stats.maxSt * 0.05f);
                m.currentSt = Mathf.Min(m.stats.maxSt, m.currentSt + recovery);
            }
        }
    }

    public bool SwapActive(int playerNum, int newIndex)
    {
        var team = playerNum == 1 ? p1Team : p2Team;
        if (newIndex < 0 || newIndex >= team.Count) return false;

        var newActive = team[newIndex];
        if (newActive.currentHp <= 0) return false;

        if (playerNum == 1) p1Active = newActive;
        else p2Active = newActive;

        newActive.gauge = 0f;
        return true;
    }
}

public class TimelineTickResult
{
    public int player; // 1 or 2
    public Monster actor;
}
```

---

## 2. Data Management

### 2.1 ScriptableObject Hierarchy

**Design Principle:** Separate templates (immutable) from instances (mutable runtime state)

```
ScriptableObjects/
├── Monsters/
│   ├── m_001_FlammePuppyTemplate.asset
│   ├── m_002_AquaTurtleTemplate.asset
│   └── ...
├── Skills/
│   ├── Strike.asset
│   ├── Fireball.asset
│   └── ...
├── ItemData/
│   ├── BattleItems/
│   └── MapItems/
└── GameData.asset (global reference to all)
```

### 2.2 MonsterTemplate ScriptableObject

```csharp
// Assets/Scripts/Data/MonsterTemplate.cs
[CreateAssetMenu(fileName = "MonsterTemplate_", menuName = "Game/Monster Template")]
public class MonsterTemplate : ScriptableObject
{
    public string id;
    public new string name;
    public ElementType mainElement;
    public ElementType subElement;

    public MonsterStats baseStats;

    // Default starting params (size=50, hardness=50, intelligence=50)
    public GrowthParams defaultParams;

    public List<string> skillIds;

    // Sprite for roster/battle UI
    public Sprite sprite;

    public Monster CreateInstance()
    {
        return new Monster(this);
    }
}
```

### 2.3 Affinity Table (2D Lookup)

**Option A: Dictionary (runtime lookup)**
```csharp
private Dictionary<(ElementType atk, ElementType def), float> affinityMap;

// Load from JSON or build in code:
affinityMap[(ElementType.Fire, ElementType.Ice)] = 2f;
affinityMap[(ElementType.Fire, ElementType.Water)] = 0.5f;
// etc.
```

**Option B: Nested ScriptableObject (editor-friendly)**
```csharp
[System.Serializable]
public class AffinityRow
{
    public ElementType defendElement;
    public List<float> multipliers; // indexed by [attacker element]
}

[CreateAssetMenu(fileName = "AffinityTable", menuName = "Game/Affinity Table")]
public class AffinityTable : ScriptableObject
{
    public List<AffinityRow> rows;

    public float Get(ElementType atk, ElementType def)
    {
        // lookup in rows...
    }
}
```

**Recommendation:** Option A (Dictionary) for speed, with JSON import from existing data.

### 2.4 DataManager (Singleton)

```csharp
// Assets/Scripts/Systems/DataManager.cs
public class DataManager : MonoBehaviour
{
    public static DataManager Instance { get; private set; }

    [SerializeField] private List<MonsterTemplate> monsterTemplates;
    [SerializeField] private List<Skill> skills;
    [SerializeField] private AffinityTable affinityTable;

    private Dictionary<string, MonsterTemplate> monsterDict;
    private Dictionary<string, Skill> skillDict;

    private void Awake()
    {
        if (Instance != null && Instance != this) Destroy(gameObject);
        else Instance = this;

        BuildLookups();
        BattleEngine.Initialize(this);
    }

    private void BuildLookups()
    {
        monsterDict = monsterTemplates.ToDictionary(m => m.id);
        skillDict = skills.ToDictionary(s => s.id);
    }

    public MonsterTemplate GetMonsterTemplate(string id) => monsterDict.TryGetValue(id, out var m) ? m : null;
    public Skill GetSkill(string id) => skillDict.TryGetValue(id, out var s) ? s : null;
    public float? GetAffinity(ElementType atk, ElementType def) => affinityTable.Get(atk, def);
}
```

### 2.5 Save/Load System

**Use:** Application.persistentDataPath + JSON (not PlayerPrefs for complex data)

```csharp
// Assets/Scripts/Systems/SaveManager.cs
public class SaveManager : MonoBehaviour
{
    private string savePath => Path.Combine(Application.persistentDataPath, "monstersave.json");

    [System.Serializable]
    public class SaveData
    {
        public string playerName;
        public int monsterIdCounter;
        public int unlockedStages;
        public int currentStage;
        public bool hubVisited;
        public bool stageCleared;
        public string currentNodeId;
        public List<string> selectedIds;
        public List<MonsterData> globalRoster;
        public InventoryData globalInventory;
    }

    public void SaveGame(GameState gameState)
    {
        var data = new SaveData
        {
            playerName = gameState.playerName,
            monsterIdCounter = gameState.monsterIdCounter,
            unlockedStages = gameState.unlockedStages,
            currentStage = gameState.currentStage,
            hubVisited = gameState.hubVisited,
            stageCleared = gameState.stageCleared,
            currentNodeId = gameState.currentNodeId,
            selectedIds = gameState.selectedIds,
            globalRoster = gameState.globalRoster.Select(m => m.ToData()).ToList(),
            globalInventory = gameState.globalInventory
        };

        string json = JsonUtility.ToJson(data, true);
        File.WriteAllText(savePath, json);
    }

    public SaveData LoadGame()
    {
        if (!File.Exists(savePath)) return null;

        try
        {
            string json = File.ReadAllText(savePath);
            return JsonUtility.FromJson<SaveData>(json);
        }
        catch (System.Exception e)
        {
            Debug.LogError($"Failed to load save: {e}");
            return null;
        }
    }

    public void DeleteSave()
    {
        if (File.Exists(savePath))
            File.Delete(savePath);
    }
}

[System.Serializable]
public class MonsterData
{
    public string id;
    public string name;
    public string mainElement;
    public string subElement;
    public MonsterStats baseStats;
    public GrowthParams @params;
    public List<string> skillIds;
    public List<GrowthLogEntry> growthLog;
}
```

---

## 3. Game Loop Architecture

### 3.1 State Machine (Enum-Based)

**States:** Menu, Naming, Hub, MapSelection, Map, Battle, Reward, EggHatch

```csharp
// Assets/Scripts/Game/AppState.cs
[System.Serializable]
public class GameState
{
    public enum GameScreen { Menu, Story, Name, Hub, MapSelection, Map, Battle, Reward, Egg }

    public string playerName;
    public GameScreen currentScreen;

    public int monsterIdCounter;
    public int unlockedStages;
    public int currentStage;
    public bool hubVisited;
    public bool stageCleared;
    public string currentNodeId;

    public List<Monster> globalRoster;
    public List<string> selectedIds;
    public InventoryData globalInventory;

    // Battle state
    public MapNode currentNode;
    public List<Monster> p1Team;
    public List<Monster> p2Team;
    public ATBTimeline timeline;
}

[System.Serializable]
public class InventoryData
{
    public List<string> skillIds;
    public List<BattleItemStack> battleItems;
    public List<MapItemStack> mapItems;
}

[System.Serializable]
public class BattleItemStack
{
    public string itemId;
    public int quantity;
}

[System.Serializable]
public class MapItemStack
{
    public string itemId;
    public int quantity;
}
```

### 3.2 Battle Loop (Coroutine)

```csharp
// Assets/Scripts/Game/BattleManager.cs
public class BattleManager : MonoBehaviour
{
    private GameState state;
    private BattleUI battleUI;

    private Coroutine battleLoopCoroutine;

    public void StartBattle(GameState gs)
    {
        state = gs;
        battleLoopCoroutine = StartCoroutine(BattleLoop());
    }

    private IEnumerator BattleLoop()
    {
        while (true)
        {
            // Advance timeline
            var tickResult = state.timeline.Tick(Time.deltaTime);

            if (tickResult != null)
            {
                // Someone's turn
                if (tickResult.player == 1)
                    yield return StartCoroutine(PlayerTurn(tickResult.actor));
                else
                    yield return StartCoroutine(EnemyTurn(tickResult.actor));

                state.timeline.OnActionCompleted(tickResult.player);

                // Check battle end
                if (IsBattleOver(out int winner))
                {
                    yield return StartCoroutine(BattleEnd(winner));
                    break;
                }
            }

            yield return null; // Wait for next frame
        }
    }

    private IEnumerator PlayerTurn(Monster actor)
    {
        battleUI.ShowActionMenu(actor);
        var action = yield return new WaitForAction(); // custom wait instruction

        // Execute skill or use item
        var result = BattleEngine.ExecuteSkill(actor, action.target, action.skillId);
        battleUI.LogAction(result);
        battleUI.UpdateMonsterStates(state.p1Team, state.p2Team);

        yield return new WaitForSeconds(0.5f); // animation time
    }

    private IEnumerator EnemyTurn(Monster actor)
    {
        // Simple AI: pick random skill and random target
        string skillId = actor.skillIds[Random.Range(0, actor.skillIds.Count)];
        var target = state.p1Team[Random.Range(0, state.p1Team.Count)];

        var result = BattleEngine.ExecuteSkill(actor, target, skillId);
        battleUI.LogAction(result);
        battleUI.UpdateMonsterStates(state.p1Team, state.p2Team);

        yield return new WaitForSeconds(1f); // longer delay for enemy actions
    }

    private bool IsBattleOver(out int winner)
    {
        bool p1Alive = state.p1Team.Any(m => m.currentHp > 0);
        bool p2Alive = state.p2Team.Any(m => m.currentHp > 0);

        if (!p1Alive) { winner = 2; return true; }
        if (!p2Alive) { winner = 1; return true; }

        winner = 0;
        return false;
    }

    private IEnumerator BattleEnd(int winner)
    {
        battleUI.ShowBattleEnd(winner);
        yield return new WaitForSeconds(2f);
    }
}
```

---

## 4. Scene Architecture

### 4.1 Scene Hierarchy

| Scene | Purpose | Canvas? | Persistent? |
|-------|---------|---------|-------------|
| **Bootstrap** | Initialize DataManager, SaveManager | No | Yes (DontDestroyOnLoad) |
| **Menu** | Start, Story, Name screens | Yes | No |
| **Hub** | Party display, stage selection, inventory | Yes | No |
| **Map** | Slay the Spire-style node map | Yes | No |
| **Battle** | Combat, ATB timeline, battle UI | Yes | No |
| **Reward** | Post-battle reward screen | Yes | No |
| **Egg** | Egg hatch selection | Yes | No |

### 4.2 Scene Manager

```csharp
// Assets/Scripts/Systems/SceneManager.cs (custom, not Unity's)
public class GameSceneManager : MonoBehaviour
{
    public static GameSceneManager Instance { get; private set; }

    public async void LoadScene(string sceneName, System.Action onComplete = null)
    {
        var asyncLoad = UnityEngine.SceneManagement.SceneManager.LoadSceneAsync(sceneName);
        while (!asyncLoad.isDone) await Task.Delay(100);
        onComplete?.Invoke();
    }

    public void SwitchScene(string from, string to, System.Action onReady = null)
    {
        // Fade out -> Load new scene -> Fade in -> Callback
        StartCoroutine(FadeAndSwitch(from, to, onReady));
    }

    private IEnumerator FadeAndSwitch(string from, string to, System.Action onReady)
    {
        // Fade out (0.3s)
        yield return StartCoroutine(FadeOut(0.3f));

        // Load new scene
        yield return UnityEngine.SceneManagement.SceneManager.LoadSceneAsync(to);

        // Fade in (0.3s)
        yield return StartCoroutine(FadeIn(0.3f));

        onReady?.Invoke();
    }
}
```

---

## 5. UI Architecture

### 5.1 Battle UI (Canvas Hierarchy)

```
Canvas (BattleUI)
├── Panel_Timeline
│   ├── P1_MonsterDisplay
│   │   ├── HP_Bar (Slider)
│   │   ├── ST_Bar (Slider)
│   │   └── Gauge_Bar (Slider, ATB timeline)
│   └── P2_MonsterDisplay (same)
├── Panel_ActionMenu
│   ├── Button_Skill1
│   ├── Button_Skill2
│   ├── Button_Skill3
│   └── Button_UseItem
├── Panel_BattleLog
│   └── ScrollView_Log (text entries)
├── Panel_ResultMenu
│   └── Button_ReturnToMap
└── Overlay_Fade (for transitions)
```

### 5.2 Hub UI (Canvas Hierarchy)

```
Canvas (HubUI)
├── Panel_RosterGrid
│   └── Scroll_RosterCards (MonsterCard prefab)
│       ├── Image_MonsterSprite
│       ├── Text_Name
│       ├── Text_Element
│       └── Button_Select
├── Panel_StageButtons
│   ├── Button_Stage1
│   ├── Button_Stage2
│   └── Button_Stage3
├── Panel_ActionButtons
│   ├── Button_Inventory
│   ├── Button_Party
│   └── Button_Save
└── Modal_Inventory (appears on top)
    └── (dynamic item grid)
```

### 5.3 Map UI (Canvas Hierarchy - Slay the Spire Style)

```
Canvas (MapUI)
├── Panel_MapGraph
│   └── (dynamically spawn MapNode prefabs)
│       ├── Button_Node (clickable)
│       ├── Image_NodeIcon (battle, elite, rest, boss)
│       └── Text_NodeState (hidden, available, cleared, locked)
├── Panel_CurrentMonster
│   ├── Image_Sprite
│   └── Text_Stats
└── Button_Menu
```

---

## 6. Folder Structure

```
Assets/
├── Scripts/
│   ├── Bootstrap/
│   │   └── BootstrapManager.cs
│   ├── Core/
│   │   ├── Monster.cs
│   │   ├── ATBTimeline.cs
│   │   ├── BattleEngine.cs
│   │   └── MapGenerator.cs
│   ├── Models/
│   │   ├── Skill.cs
│   │   ├── SkillEffect.cs
│   │   └── ElementType.cs
│   ├── Systems/
│   │   ├── DataManager.cs
│   │   ├── SaveManager.cs
│   │   ├── GameSceneManager.cs
│   │   └── EventSystem.cs (custom events)
│   ├── Game/
│   │   ├── GameState.cs
│   │   ├── BattleManager.cs
│   │   ├── MapManager.cs
│   │   └── HubManager.cs
│   └── UI/
│       ├── BattleUI.cs
│       ├── HubUI.cs
│       ├── MapUI.cs
│       ├── MonsterCardUI.cs
│       ├── InventoryUI.cs
│       └── ToastNotification.cs
├── ScriptableObjects/
│   ├── Monsters/
│   │   ├── m_001_FlamePuppy.asset
│   │   ├── m_002_AquaTurtle.asset
│   │   └── ... (others)
│   ├── Skills/
│   │   ├── Strike.asset
│   │   ├── Fireball.asset
│   │   └── ... (others)
│   ├── Items/
│   │   ├── BattleItems/
│   │   │   ├── HealthPotion.asset
│   │   │   └── ... (others)
│   │   └── MapItems/
│   │       ├── SizeMeat.asset
│   │       └── ... (others)
│   ├── Affinity/
│   │   └── AffinityTable.asset
│   └── GameData.asset (global registry)
├── Prefabs/
│   ├── MonsterCard.prefab
│   ├── MapNode.prefab
│   ├── BattleLog.prefab
│   └── Toast.prefab
├── Data/
│   ├── monsters.json (import source)
│   ├── skills.json (import source)
│   └── affinity.json (import source)
├── Sprites/
│   ├── Monsters/
│   ├── UI/
│   └── Effects/
├── Audio/
│   ├── BGM/
│   └── SFX/
└── Scenes/
    ├── 0_Bootstrap.unity
    ├── 1_Menu.unity
    ├── 2_Hub.unity
    ├── 3_Map.unity
    ├── 4_Battle.unity
    ├── 5_Reward.unity
    └── 6_Egg.unity
```

---

## 7. Key Design Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| **Monster = pure C# class** | Decouples game logic from MonoBehaviour lifecycle; easier to test and serialize. |
| **BattleEngine = static class** | Stateless operation layer; no need for MonoBehaviour overhead. DataManager injected once. |
| **ATB Timeline = Update() loop** | Synchronous `tick()` in JS maps cleanly to `Update()` with Time.deltaTime for smooth gauge progression. |
| **Coroutine-based battle flow** | Natural fit for turn-by-turn action ordering; simplifies UI wait-for-action patterns. |
| **ScriptableObjects for templates** | Editor-friendly data definition; trivial to spawn monster instances at runtime via `MonsterTemplate.CreateInstance()`. |
| **Application.persistentDataPath** | Robust save/load for complex nested data (roster, items, growth logs); PlayerPrefs 1MB limit insufficient. |
| **Dictionary for skill/monster lookup** | O(1) lookup speed; simple string ID matching matches web version. |
| **Event system for UI updates** | Decouples BattleEngine from UI; enables future multiplayer netcode. |

---

## 8. Migration Priority (Implementation Order)

### Phase 1: Foundation (Weeks 1-2)
1. **Bootstrap + Data Loading**
   - Create DataManager, load ScriptableObjects
   - Implement SaveManager (Application.persistentDataPath)

2. **Core Classes**
   - Implement Monster, GrowthParams, MonsterStats
   - Implement BattleEngine (stateless execute_skill logic)
   - Implement ATBTimeline with gauge progression

3. **Battle Loop**
   - BattleManager with coroutine loop
   - Basic enemy AI (random skill + target)
   - WaitForAction custom instruction for player input

### Phase 2: UI & Scenes (Weeks 3-4)
4. **Menu Flow**
   - Bootstrap scene → Menu scene → Name screen → Hub scene
   - SaveManager integration (auto-load on startup)

5. **Hub UI**
   - Roster grid with selection
   - Stage buttons (unlocking logic)
   - Inventory panel (modal)

6. **Battle UI**
   - ATB timeline visualization (gauge bars)
   - Action menu (skill selection, item use, bench swap)
   - Battle log (toast-style or scrollable)
   - Monster stats display (HP/ST bars)

### Phase 3: Map & Progression (Weeks 5-6)
7. **Map System**
   - MapGenerator (reuse from web, adapt to Unity)
   - MapUI node visualization (Slay the Spire style)
   - Node click to select → confirm battle setup

8. **Reward Flow**
   - Post-battle rewards panel
   - Egg hatch selection
   - Monster roster addition

### Phase 4: Polish & Optimization (Week 7+)
9. **VFX & Audio**
   - Skill animations
   - Hit feedback (screen shake, numbers)
   - Background music, SFX

10. **Performance**
    - Object pooling for damage numbers, UI elements
    - Sprite atlasing
    - Audio memory management

---

## 9. Reference Data Format Examples

### Monster Template (ScriptableObject or JSON import)
```json
{
  "id": "m_001",
  "name": "フレイムパピー",
  "mainElement": "fire",
  "subElement": "none",
  "baseStats": {
    "hp": 200,
    "atk": 40,
    "def": 30,
    "mag": 20,
    "spd": 25,
    "maxSt": 80,
    "stRec": 5
  },
  "defaultParams": {
    "size": 50,
    "hardness": 50,
    "intelligence": 50
  },
  "skillIds": ["strike", "fireball"]
}
```

### Skill Template
```json
{
  "id": "fireball",
  "name": "ファイアボール",
  "category": "attack",
  "type": "magic",
  "element": "fire",
  "costSt": 15,
  "effects": [
    {
      "type": "damage_st",
      "basePower": 80
    }
  ]
}
```

### Affinity Table (8x8 matrix)
```
       Fire Water Ice Thunder Earth Wind Light Dark None
Fire   1.0  0.5  2.0  1.0     1.0   2.0  1.0   1.0  1.0
Water  2.0  1.0  1.0  0.5     2.0   1.0  1.0   1.0  1.0
...
```

---

## 10. Testing Strategy

### Unit Tests
- `MonsterStatCalculation`: Verify param-to-stat formula matches Python
- `BattleEngine.CalculateStDamage`: Test affinity, armor crush, break mechanics
- `ATBTimeline.Tick`: Verify gauge progression and turn ordering

### Integration Tests
- `BattleManager`: Full battle flow (player turn → enemy turn → end)
- `SaveManager`: Save & load round-trip integrity
- `MapGenerator`: Node generation and unlock logic

### Manual QA
- Battle: skill execution, ST/HP mechanics, BREAK state
- Map: node selection, progression unlocking
- Inventory: item usage, roster management
- Save/Load: persistence across sessions

---

## 11. Known Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| **Timeline desynchronization** (player ATB vs display) | Extrapolate gauge position in UI during animations; always sync after action. |
| **Skill data mismatch** (JS vs Python vs Unity) | Implement shared test suite; validate conversion from JSON. |
| **Save format breaking** | Version save format; include migration code for future versions. |
| **AI performance** (enemy turn delay) | Queue enemy action in advance (not during turn); execute immediately. |

---

## Appendix: Entity Relationship Diagram

```
Monster (live state)
  ├── MonsterTemplate (immutable template) [ScriptableObject]
  └── SkillIds (List<string>)
       └── Skill (ref via DataManager)

BattleManager
  ├── ATBTimeline
  │   ├── p1Team (List<Monster>)
  │   └── p2Team (List<Monster>)
  └── BattleEngine (static)
       ├── DataManager (dependency)
       └── returns BattleResult

GameState
  ├── globalRoster (List<Monster>)
  ├── globalInventory (InventoryData)
  └── currentNode (MapNode)

MapGenerator
  └── List<MapNode>
       └── type: battle | elite | rest | boss

SaveManager
  └── Application.persistentDataPath/monstersave.json
       └── SaveData (serializable)
```

---

**End of Document**

Design prepared by: Unity Migration Analysis Agent
Status: Ready for implementation
Last Updated: 2026-03-22
