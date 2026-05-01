# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: module.spec.js >> Forge Character Creator Test Suite >> Execute Native Foundry Suite
- Location: tests/module.spec.js:7:7

# Error details

```
Error: Foundry test suite failed: Context destroyed. (Likely an async issue in #testCombatEngineIntegration)

expect(received).toBeTruthy()

Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - list:
    - listitem [ref=e2]:
      - text: 
      - paragraph [ref=e3]: "Omega Test: Spawning DB Actors..."
      - text: 
    - listitem [ref=e4]:
      - text: 
      - paragraph [ref=e5]: Successfully saved to forge-features compendium.
      - text: 
    - listitem [ref=e6]:
      - text: 
      - paragraph [ref=e7]: Successfully created Test Warrior E2E!
      - text: 
    - listitem [ref=e8]:
      - text: 
      - paragraph [ref=e9]: Foundry Virtual Tabletop requires a screen resolution of 1366px by 768px or greater. Your display has a resolution of 1280px by 720px. You must increase your resolution or use a different display device, or else some features of the software will not work properly.
      - text: 
    - listitem [ref=e10]:
      - text: 
      - paragraph [ref=e11]: Your web browser does not have hardware acceleration enabled. This will severely impair the performance of Foundry Virtual Tabletop and cause graphical errors and anomalies. Be sure to enable hardware acceleration in your browser settings.
      - text: 
  - generic [ref=e12]:
    - generic:
      - generic:
        - complementary:
          - list:
            - listitem:
              - tab "Token Controls" [ref=e13]: 
            - listitem:
              - tab "Measurement Controls" [ref=e14] [cursor=pointer]: 
            - listitem:
              - tab "Tile Controls" [ref=e15] [cursor=pointer]: 
            - listitem:
              - tab "Drawing Tools" [ref=e16] [cursor=pointer]: 
            - listitem:
              - tab "Wall Controls" [ref=e17] [cursor=pointer]: 
            - listitem:
              - tab "Lighting Controls" [ref=e18] [cursor=pointer]: 
            - listitem:
              - tab "Ambient Sound Controls" [ref=e19] [cursor=pointer]: 
            - listitem:
              - tab "Region Controls" [ref=e20] [cursor=pointer]: 
            - listitem:
              - tab "Journal Notes" [ref=e21] [cursor=pointer]: 
          - list:
            - listitem:
              - button "Select Tokens" [pressed] [ref=e22]: 
            - listitem:
              - button "Select Targets" [ref=e23] [cursor=pointer]: 
            - listitem:
              - button "Measure Distance" [ref=e24] [cursor=pointer]: 
            - listitem:
              - button "Unconstrained Movement" [ref=e25] [cursor=pointer]: 
        - complementary:
          - generic [ref=e26]:
            - list [ref=e27]:
              - listitem [ref=e28]:
                - generic [ref=e29]: Gamemaster [GM]
            - generic [ref=e30]:
              - generic [ref=e31]: Latency 1ms
              - generic [ref=e32]: FPS 16
              - button "" [ref=e33] [cursor=pointer]
      - generic:
        - navigation:
          - generic "Expand Navigation" [ref=e34] [cursor=pointer]:
            - generic: 
          - list:
            - listitem [ref=e35]:
              - generic [ref=e36]: Landing Page
              - list [ref=e37]:
                - listitem "Gamemaster" [ref=e38]: G
              - text: 
    - generic:
      - generic:
        - complementary:
          - generic:
            - button "Mute Volume" [ref=e39] [cursor=pointer]: 
            - button "Main Menu" [ref=e40] [cursor=pointer]: 
          - list [ref=e41]:
            - button "Display Aelrathil Entries" [ref=e42] [cursor=pointer]:
              - img "Display Aelrathil Entries"
              - generic: "1"
            - button "Empty Slot" [ref=e43] [cursor=pointer]:
              - generic: "2"
            - button "Empty Slot" [ref=e44] [cursor=pointer]:
              - generic: "3"
            - button "Empty Slot" [ref=e45] [cursor=pointer]:
              - generic: "4"
            - button "Empty Slot" [ref=e46] [cursor=pointer]:
              - generic: "5"
            - button "Empty Slot" [ref=e47] [cursor=pointer]:
              - generic: "6"
            - button "Deletes all templates" [ref=e48] [cursor=pointer]:
              - img "Deletes all templates"
              - generic: "7"
            - button "Show health bar and name" [ref=e49] [cursor=pointer]:
              - img "Show health bar and name"
              - generic: "8"
            - button "Empty Slot" [ref=e50] [cursor=pointer]:
              - generic: "9"
            - button "Empty Slot" [ref=e51] [cursor=pointer]:
              - generic: "0"
          - generic:
            - navigation:
              - button "Next Page" [ref=e52] [cursor=pointer]: 
              - generic: "1"
              - button "Previous Page" [ref=e53] [cursor=pointer]: 
            - generic:
              - button "Lock Hotbar" [ref=e54] [cursor=pointer]: 
              - button "Clear Hotbar" [ref=e55] [cursor=pointer]: 
    - generic:
      - generic:
        - generic:
          - generic:
            - list
          - textbox "Chat" [ref=e56]:
            - /placeholder: Enter message
          - generic:
            - generic:
              - button "Public Roll" [pressed] [ref=e57]: 
              - button "Private GM Roll" [ref=e58] [cursor=pointer]: 
              - button "Blind GM Roll" [ref=e59] [cursor=pointer]: 
              - button "Self Roll" [ref=e60] [cursor=pointer]: 
            - text:  
      - complementary:
        - tablist:
          - list [ref=e61]:
            - listitem [ref=e62]:
              - tab "Chat Messages" [ref=e63] [cursor=pointer]: 
            - listitem [ref=e64]:
              - tab "Combat Encounters" [ref=e65] [cursor=pointer]: 
            - listitem [ref=e66]:
              - tab "Scenes" [ref=e67] [cursor=pointer]: 
            - listitem [ref=e68]:
              - tab "Actors" [ref=e69] [cursor=pointer]: 
            - listitem [ref=e70]:
              - tab "Items" [ref=e71] [cursor=pointer]: 
            - listitem [ref=e72]:
              - tab "Journal" [ref=e73] [cursor=pointer]: 
            - listitem [ref=e74]:
              - tab "Rollable Tables" [ref=e75] [cursor=pointer]: 
            - listitem [ref=e76]:
              - tab "Card Stacks" [ref=e77] [cursor=pointer]: 
            - listitem [ref=e78]:
              - tab "Macros" [ref=e79] [cursor=pointer]: 
            - listitem [ref=e80]:
              - tab "Playlists" [ref=e81] [cursor=pointer]: 
            - listitem [ref=e82]:
              - tab "Compendium Packs" [ref=e83] [cursor=pointer]: 
            - listitem [ref=e84]:
              - tab "Game Settings" [ref=e85] [cursor=pointer]: 
            - listitem [ref=e86]:
              - button "Expand" [ref=e87] [cursor=pointer]: 
        - generic:
          - generic:
            - list [ref=e89]:
              - listitem [ref=e90]:
                - generic [ref=e91]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e92]':
                    - img "midi-qol" [ref=e94] [cursor=pointer]
                    - generic [ref=e95]:
                      - generic [ref=e96]: midi-qol
                      - generic [ref=e97]: "To: Gamemaster"
                  - generic [ref=e98]:
                    - time [ref=e99]: 38d 23h ago
                    - text: 
                    - generic "Additional Controls" [ref=e100] [cursor=pointer]:
                      - generic [ref=e101]: 
                - generic [ref=e102]:
                  - heading "Warning" [level=3] [ref=e103]
                  - paragraph [ref=e104]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e105]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e106]:
                - generic [ref=e107]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e108]':
                    - img "midi-qol" [ref=e110] [cursor=pointer]
                    - generic [ref=e111]:
                      - generic [ref=e112]: midi-qol
                      - generic [ref=e113]: "To: Gamemaster"
                  - generic [ref=e114]:
                    - time [ref=e115]: 38d 23h ago
                    - text: 
                    - generic "Additional Controls" [ref=e116] [cursor=pointer]:
                      - generic [ref=e117]: 
                - generic [ref=e118]:
                  - heading "Warning" [level=3] [ref=e119]
                  - paragraph [ref=e120]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e121]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e122]:
                - generic [ref=e123]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e124]':
                    - img "midi-qol" [ref=e126] [cursor=pointer]
                    - generic [ref=e127]:
                      - generic [ref=e128]: midi-qol
                      - generic [ref=e129]: "To: Gamemaster"
                  - generic [ref=e130]:
                    - time [ref=e131]: 38d 9h ago
                    - text: 
                    - generic "Additional Controls" [ref=e132] [cursor=pointer]:
                      - generic [ref=e133]: 
                - generic [ref=e134]:
                  - heading "Warning" [level=3] [ref=e135]
                  - paragraph [ref=e136]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e137]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e138]:
                - generic [ref=e139]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e140]':
                    - img "midi-qol" [ref=e142] [cursor=pointer]
                    - generic [ref=e143]:
                      - generic [ref=e144]: midi-qol
                      - generic [ref=e145]: "To: Gamemaster"
                  - generic [ref=e146]:
                    - time [ref=e147]: 38d 6h ago
                    - text: 
                    - generic "Additional Controls" [ref=e148] [cursor=pointer]:
                      - generic [ref=e149]: 
                - generic [ref=e150]:
                  - heading "Warning" [level=3] [ref=e151]
                  - paragraph [ref=e152]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e153]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e154]:
                - generic [ref=e155]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e156]':
                    - img "midi-qol" [ref=e158] [cursor=pointer]
                    - generic [ref=e159]:
                      - generic [ref=e160]: midi-qol
                      - generic [ref=e161]: "To: Gamemaster"
                  - generic [ref=e162]:
                    - time [ref=e163]: 38d 6h ago
                    - text: 
                    - generic "Additional Controls" [ref=e164] [cursor=pointer]:
                      - generic [ref=e165]: 
                - generic [ref=e166]:
                  - heading "Warning" [level=3] [ref=e167]
                  - paragraph [ref=e168]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e169]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e170]:
                - generic [ref=e171]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e172]':
                    - img "midi-qol" [ref=e174] [cursor=pointer]
                    - generic [ref=e175]:
                      - generic [ref=e176]: midi-qol
                      - generic [ref=e177]: "To: Gamemaster"
                  - generic [ref=e178]:
                    - time [ref=e179]: 38d 6h ago
                    - text: 
                    - generic "Additional Controls" [ref=e180] [cursor=pointer]:
                      - generic [ref=e181]: 
                - generic [ref=e182]:
                  - heading "Warning" [level=3] [ref=e183]
                  - paragraph [ref=e184]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e185]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e186]:
                - generic [ref=e187]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e188]':
                    - img "midi-qol" [ref=e190] [cursor=pointer]
                    - generic [ref=e191]:
                      - generic [ref=e192]: midi-qol
                      - generic [ref=e193]: "To: Gamemaster"
                  - generic [ref=e194]:
                    - time [ref=e195]: 38d 5h ago
                    - text: 
                    - generic "Additional Controls" [ref=e196] [cursor=pointer]:
                      - generic [ref=e197]: 
                - generic [ref=e198]:
                  - heading "Warning" [level=3] [ref=e199]
                  - paragraph [ref=e200]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e201]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e202]:
                - generic [ref=e203]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e204]':
                    - img "midi-qol" [ref=e206] [cursor=pointer]
                    - generic [ref=e207]:
                      - generic [ref=e208]: midi-qol
                      - generic [ref=e209]: "To: Gamemaster"
                  - generic [ref=e210]:
                    - time [ref=e211]: 38d 5h ago
                    - text: 
                    - generic "Additional Controls" [ref=e212] [cursor=pointer]:
                      - generic [ref=e213]: 
                - generic [ref=e214]:
                  - heading "Warning" [level=3] [ref=e215]
                  - paragraph [ref=e216]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e217]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e218]:
                - generic [ref=e219]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e220]':
                    - img "midi-qol" [ref=e222] [cursor=pointer]
                    - generic [ref=e223]:
                      - generic [ref=e224]: midi-qol
                      - generic [ref=e225]: "To: Gamemaster"
                  - generic [ref=e226]:
                    - time [ref=e227]: 28d 5h ago
                    - text: 
                    - generic "Additional Controls" [ref=e228] [cursor=pointer]:
                      - generic [ref=e229]: 
                - generic [ref=e230]:
                  - heading "Warning" [level=3] [ref=e231]
                  - paragraph [ref=e232]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e233]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e234]:
                - generic [ref=e235]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e236]':
                    - img "midi-qol" [ref=e238] [cursor=pointer]
                    - generic [ref=e239]:
                      - generic [ref=e240]: midi-qol
                      - generic [ref=e241]: "To: Gamemaster"
                  - generic [ref=e242]:
                    - time [ref=e243]: 28d 4h ago
                    - text: 
                    - generic "Additional Controls" [ref=e244] [cursor=pointer]:
                      - generic [ref=e245]: 
                - generic [ref=e246]:
                  - heading "Warning" [level=3] [ref=e247]
                  - paragraph [ref=e248]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e249]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e250]:
                - generic [ref=e251]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e252]':
                    - img "midi-qol" [ref=e254] [cursor=pointer]
                    - generic [ref=e255]:
                      - generic [ref=e256]: midi-qol
                      - generic [ref=e257]: "To: Gamemaster"
                  - generic [ref=e258]:
                    - time [ref=e259]: 28d 4h ago
                    - text: 
                    - generic "Additional Controls" [ref=e260] [cursor=pointer]:
                      - generic [ref=e261]: 
                - generic [ref=e262]:
                  - heading "Warning" [level=3] [ref=e263]
                  - paragraph [ref=e264]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e265]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e266]:
                - generic [ref=e267]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e268]':
                    - img "midi-qol" [ref=e270] [cursor=pointer]
                    - generic [ref=e271]:
                      - generic [ref=e272]: midi-qol
                      - generic [ref=e273]: "To: Gamemaster"
                  - generic [ref=e274]:
                    - time [ref=e275]: 28d 3h ago
                    - text: 
                    - generic "Additional Controls" [ref=e276] [cursor=pointer]:
                      - generic [ref=e277]: 
                - generic [ref=e278]:
                  - heading "Warning" [level=3] [ref=e279]
                  - paragraph [ref=e280]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e281]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e282]:
                - generic [ref=e283]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e284]':
                    - img "midi-qol" [ref=e286] [cursor=pointer]
                    - generic [ref=e287]:
                      - generic [ref=e288]: midi-qol
                      - generic [ref=e289]: "To: Gamemaster"
                  - generic [ref=e290]:
                    - time [ref=e291]: 28d 2h ago
                    - text: 
                    - generic "Additional Controls" [ref=e292] [cursor=pointer]:
                      - generic [ref=e293]: 
                - generic [ref=e294]:
                  - heading "Warning" [level=3] [ref=e295]
                  - paragraph [ref=e296]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e297]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e298]:
                - generic [ref=e299]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e300]':
                    - img "midi-qol" [ref=e302] [cursor=pointer]
                    - generic [ref=e303]:
                      - generic [ref=e304]: midi-qol
                      - generic [ref=e305]: "To: Gamemaster"
                  - generic [ref=e306]:
                    - time [ref=e307]: 28d 2h ago
                    - text: 
                    - generic "Additional Controls" [ref=e308] [cursor=pointer]:
                      - generic [ref=e309]: 
                - generic [ref=e310]:
                  - heading "Warning" [level=3] [ref=e311]
                  - paragraph [ref=e312]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e313]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e314]:
                - generic [ref=e315]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e316]':
                    - img "midi-qol" [ref=e318] [cursor=pointer]
                    - generic [ref=e319]:
                      - generic [ref=e320]: midi-qol
                      - generic [ref=e321]: "To: Gamemaster"
                  - generic [ref=e322]:
                    - time [ref=e323]: 28d 57m ago
                    - text: 
                    - generic "Additional Controls" [ref=e324] [cursor=pointer]:
                      - generic [ref=e325]: 
                - generic [ref=e326]:
                  - heading "Warning" [level=3] [ref=e327]
                  - paragraph [ref=e328]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e329]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e330]:
                - generic [ref=e331]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e332]':
                    - img "midi-qol" [ref=e334] [cursor=pointer]
                    - generic [ref=e335]:
                      - generic [ref=e336]: midi-qol
                      - generic [ref=e337]: "To: Gamemaster"
                  - generic [ref=e338]:
                    - time [ref=e339]: 28d 32m ago
                    - text: 
                    - generic "Additional Controls" [ref=e340] [cursor=pointer]:
                      - generic [ref=e341]: 
                - generic [ref=e342]:
                  - heading "Warning" [level=3] [ref=e343]
                  - paragraph [ref=e344]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e345]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e346]:
                - generic [ref=e347]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e348]':
                    - img "midi-qol" [ref=e350] [cursor=pointer]
                    - generic [ref=e351]:
                      - generic [ref=e352]: midi-qol
                      - generic [ref=e353]: "To: Gamemaster"
                  - generic [ref=e354]:
                    - time [ref=e355]: 4d 22h ago
                    - text: 
                    - generic "Additional Controls" [ref=e356] [cursor=pointer]:
                      - generic [ref=e357]: 
                - generic [ref=e358]:
                  - heading "Warning" [level=3] [ref=e359]
                  - paragraph [ref=e360]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e361]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e362]:
                - generic [ref=e363]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e364]':
                    - img "midi-qol" [ref=e366] [cursor=pointer]
                    - generic [ref=e367]:
                      - generic [ref=e368]: midi-qol
                      - generic [ref=e369]: "To: Gamemaster"
                  - generic [ref=e370]:
                    - time [ref=e371]: 4d 22h ago
                    - text: 
                    - generic "Additional Controls" [ref=e372] [cursor=pointer]:
                      - generic [ref=e373]: 
                - generic [ref=e374]:
                  - heading "Warning" [level=3] [ref=e375]
                  - paragraph [ref=e376]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e377]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e378]:
                - generic [ref=e379]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e380]':
                    - img "midi-qol" [ref=e382] [cursor=pointer]
                    - generic [ref=e383]:
                      - generic [ref=e384]: midi-qol
                      - generic [ref=e385]: "To: Gamemaster"
                  - generic [ref=e386]:
                    - time [ref=e387]: 4d 22h ago
                    - text: 
                    - generic "Additional Controls" [ref=e388] [cursor=pointer]:
                      - generic [ref=e389]: 
                - generic [ref=e390]:
                  - heading "Warning" [level=3] [ref=e391]
                  - paragraph [ref=e392]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e393]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e394]:
                - generic [ref=e395]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e396]':
                    - img "midi-qol" [ref=e398] [cursor=pointer]
                    - generic [ref=e399]:
                      - generic [ref=e400]: midi-qol
                      - generic [ref=e401]: "To: Gamemaster"
                  - generic [ref=e402]:
                    - time [ref=e403]: 4d 22h ago
                    - text: 
                    - generic "Additional Controls" [ref=e404] [cursor=pointer]:
                      - generic [ref=e405]: 
                - generic [ref=e406]:
                  - heading "Warning" [level=3] [ref=e407]
                  - paragraph [ref=e408]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e409]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e410]:
                - generic [ref=e411]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e412]':
                    - img "midi-qol" [ref=e414] [cursor=pointer]
                    - generic [ref=e415]:
                      - generic [ref=e416]: midi-qol
                      - generic [ref=e417]: "To: Gamemaster"
                  - generic [ref=e418]:
                    - time [ref=e419]: 4d 22h ago
                    - text: 
                    - generic "Additional Controls" [ref=e420] [cursor=pointer]:
                      - generic [ref=e421]: 
                - generic [ref=e422]:
                  - heading "Warning" [level=3] [ref=e423]
                  - paragraph [ref=e424]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e425]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e426]:
                - generic [ref=e427]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e428]':
                    - img "midi-qol" [ref=e430] [cursor=pointer]
                    - generic [ref=e431]:
                      - generic [ref=e432]: midi-qol
                      - generic [ref=e433]: "To: Gamemaster"
                  - generic [ref=e434]:
                    - time [ref=e435]: 19h 22m ago
                    - text: 
                    - generic "Additional Controls" [ref=e436] [cursor=pointer]:
                      - generic [ref=e437]: 
                - generic [ref=e438]:
                  - heading "Warning" [level=3] [ref=e439]
                  - paragraph [ref=e440]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e441]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e442]:
                - generic [ref=e443]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e444]':
                    - img "midi-qol" [ref=e446] [cursor=pointer]
                    - generic [ref=e447]:
                      - generic [ref=e448]: midi-qol
                      - generic [ref=e449]: "To: Gamemaster"
                  - generic [ref=e450]:
                    - time [ref=e451]: 19h 21m ago
                    - text: 
                    - generic "Additional Controls" [ref=e452] [cursor=pointer]:
                      - generic [ref=e453]: 
                - generic [ref=e454]:
                  - heading "Warning" [level=3] [ref=e455]
                  - paragraph [ref=e456]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e457]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e458]:
                - generic [ref=e459]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e460]':
                    - img "midi-qol" [ref=e462] [cursor=pointer]
                    - generic [ref=e463]:
                      - generic [ref=e464]: midi-qol
                      - generic [ref=e465]: "To: Gamemaster"
                  - generic [ref=e466]:
                    - time [ref=e467]: 19h 19m ago
                    - text: 
                    - generic "Additional Controls" [ref=e468] [cursor=pointer]:
                      - generic [ref=e469]: 
                - generic [ref=e470]:
                  - heading "Warning" [level=3] [ref=e471]
                  - paragraph [ref=e472]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e473]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e474]:
                - generic [ref=e475]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e476]':
                    - img "midi-qol" [ref=e478] [cursor=pointer]
                    - generic [ref=e479]:
                      - generic [ref=e480]: midi-qol
                      - generic [ref=e481]: "To: Gamemaster"
                  - generic [ref=e482]:
                    - time [ref=e483]: 9h 58m ago
                    - text: 
                    - generic "Additional Controls" [ref=e484] [cursor=pointer]:
                      - generic [ref=e485]: 
                - generic [ref=e486]:
                  - heading "Warning" [level=3] [ref=e487]
                  - paragraph [ref=e488]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e489]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e490]:
                - generic [ref=e491]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e492]':
                    - img "midi-qol" [ref=e494] [cursor=pointer]
                    - generic [ref=e495]:
                      - generic [ref=e496]: midi-qol
                      - generic [ref=e497]: "To: Gamemaster"
                  - generic [ref=e498]:
                    - time [ref=e499]: 13s ago
                    - text: 
                    - generic "Additional Controls" [ref=e500] [cursor=pointer]:
                      - generic [ref=e501]: 
                - generic [ref=e502]:
                  - heading "Warning" [level=3] [ref=e503]
                  - paragraph [ref=e504]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e505]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
            - generic: 
          - text: +            +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +         +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +   +  +   +  +   +  +   +  +   +  +         +  +   +  +   +  +   +  +   +  +         +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +                     +  +              +  +  +                        +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +     +  +                               +  +   +  +                  +  +            +  +                  +  +                              +  +   +  +   +  +   +  +   +  +                  • • •            
  - figure:
    - generic:
      - img
      - generic: Game Paused
  - button "" [ref=e507] [cursor=pointer]:
    - generic: 
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Forge Character Creator Test Suite', () => {
  4  |   // Give Foundry time to boot, load canvas, and run long combat sequences
  5  |   test.setTimeout(120000); 
  6  | 
  7  |   test('Execute Native Foundry Suite', async ({ page }) => {
  8  |     
  9  |     // 1. Navigate to local Foundry instance
  10 |     await page.goto('http://localhost:30000');
  11 |     
  12 |     // 2. Handle optional Setup screen (if world isn't booted)
  13 |     if (page.url().includes('/setup')) {
  14 |       console.log('On setup page. Launching world...');
  15 |       await page.evaluate(async () => {
  16 |          await fetch('/setup', {
  17 |            method: 'POST',
  18 |            headers: { 'Content-Type': 'application/json' },
  19 |            body: JSON.stringify({ action: 'launchWorld', world: 'ishait' }) // defaults to your dev world
  20 |          });
  21 |       });
  22 |       await page.waitForTimeout(2000);
  23 |       await page.goto('http://localhost:30000/join');
  24 |     }
  25 | 
  26 |     // 3. Log in as Gamemaster
  27 |     console.log('Logging in...');
  28 |     await page.waitForSelector('select[name="userid"]', { timeout: 10000 });
  29 |     await page.selectOption('select[name="userid"]', { label: 'Gamemaster' });
  30 |     await page.click('button[name="join"]');
  31 |     await page.waitForNavigation({ timeout: 15000 });
  32 | 
  33 |     // 4. Wait for the Foundry Canvas and Modules to load
  34 |     console.log('Waiting for Foundry UI...');
  35 |     await page.waitForSelector('#ui-middle', { timeout: 30000 });
  36 |     await page.waitForTimeout(5000); // Give macro/Midi hooks time to attach
  37 | 
  38 |     // Forward browser console to terminal for visibility
  39 |     page.on('console', msg => {
  40 |       const txt = msg.text();
  41 |       if (!txt.includes('Retrieved and compiled template') && !txt.includes('GL Driver Message')) {
  42 |         console.log(`[Foundry] ${txt}`);
  43 |       }
  44 |     });
  45 | 
  46 |     // 5. Execute the internal test suite
  47 |     console.log('Triggering internal module suite...');
  48 |     const result = await page.evaluate(async () => {
  49 |       if (typeof ForgeTestingSuite === 'undefined') {
  50 |         return { success: false, error: "ForgeTestingSuite not found. Is the module active?" };
  51 |       }
  52 |       
  53 |       try {
  54 |         console.group = console.log;
  55 |         console.groupEnd = () => {};
  56 |         
  57 |         await ForgeTestingSuite.runAll();
  58 |         return { success: true };
  59 |       } catch (err) {
  60 |         return { success: false, error: err.message };
  61 |       }
  62 |     }).catch(e => {
  63 |         // Handle navigation resets from the Omega combat simulator pushing new scenes/combats
  64 |         if (e.message.includes('Execution context was destroyed')) {
  65 |            return { success: false, error: 'Context destroyed. (Likely an async issue in #testCombatEngineIntegration)' };
  66 |         }
  67 |         return { success: false, error: e.message };
  68 |     });
  69 | 
  70 |     // 6. Assert success
> 71 |     expect(result.success, `Foundry test suite failed: ${result.error}`).toBeTruthy();
     |                                                                          ^ Error: Foundry test suite failed: Context destroyed. (Likely an async issue in #testCombatEngineIntegration)
  72 |   });
  73 | });
  74 | 
```