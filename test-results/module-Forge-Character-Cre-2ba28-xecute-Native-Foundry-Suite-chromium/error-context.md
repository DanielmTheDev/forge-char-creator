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
      - paragraph [ref=e3]: "Omega Test: Initializing Combat Encounter..."
      - text: 
    - listitem [ref=e4]:
      - text: 
      - paragraph [ref=e5]: "Omega Test: Dropping Tokens onto Scene..."
      - text: 
    - listitem [ref=e6]:
      - text: 
      - paragraph [ref=e7]: Successfully saved to forge-features compendium.
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
              - generic [ref=e32]: FPS 15
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
                  - 'heading "after tyrn after tyrn To: Gamemaster" [level=4] [ref=e92]':
                    - img "after tyrn" [ref=e94] [cursor=pointer]
                    - generic [ref=e95]:
                      - generic [ref=e96]: after tyrn
                      - generic [ref=e97]: "To: Gamemaster"
                  - generic [ref=e98]:
                    - time [ref=e99]: 38d 5h ago
                    - text: 
                    - generic "Additional Controls" [ref=e100] [cursor=pointer]:
                      - generic [ref=e101]: 
                - generic [ref=e103]:
                  - generic [ref=e104]:
                    - generic [ref=e105] [cursor=pointer]:
                      - img "wer" [ref=e106]
                      - generic [ref=e107]:
                        - generic [ref=e108]: wer
                        - generic [ref=e109]: Feature
                      - generic [ref=e110]: 
                    - generic [ref=e112]: "[object Object]"
                  - generic [ref=e113]:
                    - generic [ref=e114]:
                      - generic [ref=e115]:
                        - generic [ref=e116]: Damage
                        - generic [ref=e118] [cursor=pointer]:
                          - generic [ref=e119]: "5"
                          - generic [ref=e121]:
                            - list [ref=e122]:
                              - listitem [ref=e123]: "+5"
                            - generic [ref=e124]:
                              - img "Fire" [ref=e125]
                              - generic [ref=e126]: Fire
                              - generic [ref=e127]: "5"
                          - heading "5 " [level=4] [ref=e128]
                      - generic [ref=e130]:
                        - strong [ref=e132]: DC 14 Dexterity Saving Throw
                        - strong [ref=e134]: Damage 0
                        - list [ref=e135]:
                          - listitem [ref=e136] [cursor=pointer]:
                            - generic [ref=e137]: 
                            - img [ref=e138]
                            - generic [ref=e141]: Dummy
                            - generic [ref=e143]: "14"
                    - list [ref=e144]:
                      - listitem [ref=e145]:
                        - generic [ref=e146]: Action
                      - listitem [ref=e147]:
                        - generic [ref=e148]: Instantaneous
                      - listitem [ref=e149]:
                        - generic [ref=e150]: Self
              - listitem [ref=e151]:
                - generic [ref=e152]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e153]':
                    - img "midi-qol" [ref=e155] [cursor=pointer]
                    - generic [ref=e156]:
                      - generic [ref=e157]: midi-qol
                      - generic [ref=e158]: "To: Gamemaster"
                  - generic [ref=e159]:
                    - time [ref=e160]: 38d 4h ago
                    - text: 
                    - generic "Additional Controls" [ref=e161] [cursor=pointer]:
                      - generic [ref=e162]: 
                - generic [ref=e163]:
                  - heading "Warning" [level=3] [ref=e164]
                  - paragraph [ref=e165]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e166]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e167]:
                - generic [ref=e168]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e169]':
                    - img "midi-qol" [ref=e171] [cursor=pointer]
                    - generic [ref=e172]:
                      - generic [ref=e173]: midi-qol
                      - generic [ref=e174]: "To: Gamemaster"
                  - generic [ref=e175]:
                    - time [ref=e176]: 38d 4h ago
                    - text: 
                    - generic "Additional Controls" [ref=e177] [cursor=pointer]:
                      - generic [ref=e178]: 
                - generic [ref=e179]:
                  - heading "Warning" [level=3] [ref=e180]
                  - paragraph [ref=e181]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e182]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e183]:
                - generic [ref=e184]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e185]':
                    - img "midi-qol" [ref=e187] [cursor=pointer]
                    - generic [ref=e188]:
                      - generic [ref=e189]: midi-qol
                      - generic [ref=e190]: "To: Gamemaster"
                  - generic [ref=e191]:
                    - time [ref=e192]: 38d 4h ago
                    - text: 
                    - generic "Additional Controls" [ref=e193] [cursor=pointer]:
                      - generic [ref=e194]: 
                - generic [ref=e195]:
                  - heading "Warning" [level=3] [ref=e196]
                  - paragraph [ref=e197]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e198]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e199]:
                - generic [ref=e200]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e201]':
                    - img "midi-qol" [ref=e203] [cursor=pointer]
                    - generic [ref=e204]:
                      - generic [ref=e205]: midi-qol
                      - generic [ref=e206]: "To: Gamemaster"
                  - generic [ref=e207]:
                    - time [ref=e208]: 37d 14h ago
                    - text: 
                    - generic "Additional Controls" [ref=e209] [cursor=pointer]:
                      - generic [ref=e210]: 
                - generic [ref=e211]:
                  - heading "Warning" [level=3] [ref=e212]
                  - paragraph [ref=e213]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e214]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e215]:
                - generic [ref=e216]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e217]':
                    - img "midi-qol" [ref=e219] [cursor=pointer]
                    - generic [ref=e220]:
                      - generic [ref=e221]: midi-qol
                      - generic [ref=e222]: "To: Gamemaster"
                  - generic [ref=e223]:
                    - time [ref=e224]: 37d 11h ago
                    - text: 
                    - generic "Additional Controls" [ref=e225] [cursor=pointer]:
                      - generic [ref=e226]: 
                - generic [ref=e227]:
                  - heading "Warning" [level=3] [ref=e228]
                  - paragraph [ref=e229]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e230]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e231]:
                - generic [ref=e232]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e233]':
                    - img "midi-qol" [ref=e235] [cursor=pointer]
                    - generic [ref=e236]:
                      - generic [ref=e237]: midi-qol
                      - generic [ref=e238]: "To: Gamemaster"
                  - generic [ref=e239]:
                    - time [ref=e240]: 37d 11h ago
                    - text: 
                    - generic "Additional Controls" [ref=e241] [cursor=pointer]:
                      - generic [ref=e242]: 
                - generic [ref=e243]:
                  - heading "Warning" [level=3] [ref=e244]
                  - paragraph [ref=e245]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e246]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e247]:
                - generic [ref=e248]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e249]':
                    - img "midi-qol" [ref=e251] [cursor=pointer]
                    - generic [ref=e252]:
                      - generic [ref=e253]: midi-qol
                      - generic [ref=e254]: "To: Gamemaster"
                  - generic [ref=e255]:
                    - time [ref=e256]: 37d 10h ago
                    - text: 
                    - generic "Additional Controls" [ref=e257] [cursor=pointer]:
                      - generic [ref=e258]: 
                - generic [ref=e259]:
                  - heading "Warning" [level=3] [ref=e260]
                  - paragraph [ref=e261]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e262]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e263]:
                - generic [ref=e264]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e265]':
                    - img "midi-qol" [ref=e267] [cursor=pointer]
                    - generic [ref=e268]:
                      - generic [ref=e269]: midi-qol
                      - generic [ref=e270]: "To: Gamemaster"
                  - generic [ref=e271]:
                    - time [ref=e272]: 37d 10h ago
                    - text: 
                    - generic "Additional Controls" [ref=e273] [cursor=pointer]:
                      - generic [ref=e274]: 
                - generic [ref=e275]:
                  - heading "Warning" [level=3] [ref=e276]
                  - paragraph [ref=e277]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e278]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e279]:
                - generic [ref=e280]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e281]':
                    - img "midi-qol" [ref=e283] [cursor=pointer]
                    - generic [ref=e284]:
                      - generic [ref=e285]: midi-qol
                      - generic [ref=e286]: "To: Gamemaster"
                  - generic [ref=e287]:
                    - time [ref=e288]: 37d 10h ago
                    - text: 
                    - generic "Additional Controls" [ref=e289] [cursor=pointer]:
                      - generic [ref=e290]: 
                - generic [ref=e291]:
                  - heading "Warning" [level=3] [ref=e292]
                  - paragraph [ref=e293]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e294]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e295]:
                - generic [ref=e296]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e297]':
                    - img "midi-qol" [ref=e299] [cursor=pointer]
                    - generic [ref=e300]:
                      - generic [ref=e301]: midi-qol
                      - generic [ref=e302]: "To: Gamemaster"
                  - generic [ref=e303]:
                    - time [ref=e304]: 27d 10h ago
                    - text: 
                    - generic "Additional Controls" [ref=e305] [cursor=pointer]:
                      - generic [ref=e306]: 
                - generic [ref=e307]:
                  - heading "Warning" [level=3] [ref=e308]
                  - paragraph [ref=e309]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e310]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e311]:
                - generic [ref=e312]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e313]':
                    - img "midi-qol" [ref=e315] [cursor=pointer]
                    - generic [ref=e316]:
                      - generic [ref=e317]: midi-qol
                      - generic [ref=e318]: "To: Gamemaster"
                  - generic [ref=e319]:
                    - time [ref=e320]: 27d 9h ago
                    - text: 
                    - generic "Additional Controls" [ref=e321] [cursor=pointer]:
                      - generic [ref=e322]: 
                - generic [ref=e323]:
                  - heading "Warning" [level=3] [ref=e324]
                  - paragraph [ref=e325]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e326]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e327]:
                - generic [ref=e328]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e329]':
                    - img "midi-qol" [ref=e331] [cursor=pointer]
                    - generic [ref=e332]:
                      - generic [ref=e333]: midi-qol
                      - generic [ref=e334]: "To: Gamemaster"
                  - generic [ref=e335]:
                    - time [ref=e336]: 27d 9h ago
                    - text: 
                    - generic "Additional Controls" [ref=e337] [cursor=pointer]:
                      - generic [ref=e338]: 
                - generic [ref=e339]:
                  - heading "Warning" [level=3] [ref=e340]
                  - paragraph [ref=e341]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e342]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e343]:
                - generic [ref=e344]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e345]':
                    - img "midi-qol" [ref=e347] [cursor=pointer]
                    - generic [ref=e348]:
                      - generic [ref=e349]: midi-qol
                      - generic [ref=e350]: "To: Gamemaster"
                  - generic [ref=e351]:
                    - time [ref=e352]: 27d 8h ago
                    - text: 
                    - generic "Additional Controls" [ref=e353] [cursor=pointer]:
                      - generic [ref=e354]: 
                - generic [ref=e355]:
                  - heading "Warning" [level=3] [ref=e356]
                  - paragraph [ref=e357]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e358]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e359]:
                - generic [ref=e360]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e361]':
                    - img "midi-qol" [ref=e363] [cursor=pointer]
                    - generic [ref=e364]:
                      - generic [ref=e365]: midi-qol
                      - generic [ref=e366]: "To: Gamemaster"
                  - generic [ref=e367]:
                    - time [ref=e368]: 27d 7h ago
                    - text: 
                    - generic "Additional Controls" [ref=e369] [cursor=pointer]:
                      - generic [ref=e370]: 
                - generic [ref=e371]:
                  - heading "Warning" [level=3] [ref=e372]
                  - paragraph [ref=e373]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e374]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e375]:
                - generic [ref=e376]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e377]':
                    - img "midi-qol" [ref=e379] [cursor=pointer]
                    - generic [ref=e380]:
                      - generic [ref=e381]: midi-qol
                      - generic [ref=e382]: "To: Gamemaster"
                  - generic [ref=e383]:
                    - time [ref=e384]: 27d 7h ago
                    - text: 
                    - generic "Additional Controls" [ref=e385] [cursor=pointer]:
                      - generic [ref=e386]: 
                - generic [ref=e387]:
                  - heading "Warning" [level=3] [ref=e388]
                  - paragraph [ref=e389]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e390]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e391]:
                - generic [ref=e392]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e393]':
                    - img "midi-qol" [ref=e395] [cursor=pointer]
                    - generic [ref=e396]:
                      - generic [ref=e397]: midi-qol
                      - generic [ref=e398]: "To: Gamemaster"
                  - generic [ref=e399]:
                    - time [ref=e400]: 27d 5h ago
                    - text: 
                    - generic "Additional Controls" [ref=e401] [cursor=pointer]:
                      - generic [ref=e402]: 
                - generic [ref=e403]:
                  - heading "Warning" [level=3] [ref=e404]
                  - paragraph [ref=e405]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e406]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e407]:
                - generic [ref=e408]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e409]':
                    - img "midi-qol" [ref=e411] [cursor=pointer]
                    - generic [ref=e412]:
                      - generic [ref=e413]: midi-qol
                      - generic [ref=e414]: "To: Gamemaster"
                  - generic [ref=e415]:
                    - time [ref=e416]: 27d 5h ago
                    - text: 
                    - generic "Additional Controls" [ref=e417] [cursor=pointer]:
                      - generic [ref=e418]: 
                - generic [ref=e419]:
                  - heading "Warning" [level=3] [ref=e420]
                  - paragraph [ref=e421]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e422]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e423]:
                - generic [ref=e424]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e425]':
                    - img "midi-qol" [ref=e427] [cursor=pointer]
                    - generic [ref=e428]:
                      - generic [ref=e429]: midi-qol
                      - generic [ref=e430]: "To: Gamemaster"
                  - generic [ref=e431]:
                    - time [ref=e432]: 4d 3h ago
                    - text: 
                    - generic "Additional Controls" [ref=e433] [cursor=pointer]:
                      - generic [ref=e434]: 
                - generic [ref=e435]:
                  - heading "Warning" [level=3] [ref=e436]
                  - paragraph [ref=e437]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e438]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e439]:
                - generic [ref=e440]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e441]':
                    - img "midi-qol" [ref=e443] [cursor=pointer]
                    - generic [ref=e444]:
                      - generic [ref=e445]: midi-qol
                      - generic [ref=e446]: "To: Gamemaster"
                  - generic [ref=e447]:
                    - time [ref=e448]: 4d 3h ago
                    - text: 
                    - generic "Additional Controls" [ref=e449] [cursor=pointer]:
                      - generic [ref=e450]: 
                - generic [ref=e451]:
                  - heading "Warning" [level=3] [ref=e452]
                  - paragraph [ref=e453]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e454]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e455]:
                - generic [ref=e456]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e457]':
                    - img "midi-qol" [ref=e459] [cursor=pointer]
                    - generic [ref=e460]:
                      - generic [ref=e461]: midi-qol
                      - generic [ref=e462]: "To: Gamemaster"
                  - generic [ref=e463]:
                    - time [ref=e464]: 4d 3h ago
                    - text: 
                    - generic "Additional Controls" [ref=e465] [cursor=pointer]:
                      - generic [ref=e466]: 
                - generic [ref=e467]:
                  - heading "Warning" [level=3] [ref=e468]
                  - paragraph [ref=e469]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e470]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e471]:
                - generic [ref=e472]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e473]':
                    - img "midi-qol" [ref=e475] [cursor=pointer]
                    - generic [ref=e476]:
                      - generic [ref=e477]: midi-qol
                      - generic [ref=e478]: "To: Gamemaster"
                  - generic [ref=e479]:
                    - time [ref=e480]: 4d 3h ago
                    - text: 
                    - generic "Additional Controls" [ref=e481] [cursor=pointer]:
                      - generic [ref=e482]: 
                - generic [ref=e483]:
                  - heading "Warning" [level=3] [ref=e484]
                  - paragraph [ref=e485]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e486]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e487]:
                - generic [ref=e488]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e489]':
                    - img "midi-qol" [ref=e491] [cursor=pointer]
                    - generic [ref=e492]:
                      - generic [ref=e493]: midi-qol
                      - generic [ref=e494]: "To: Gamemaster"
                  - generic [ref=e495]:
                    - time [ref=e496]: 4d 3h ago
                    - text: 
                    - generic "Additional Controls" [ref=e497] [cursor=pointer]:
                      - generic [ref=e498]: 
                - generic [ref=e499]:
                  - heading "Warning" [level=3] [ref=e500]
                  - paragraph [ref=e501]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e502]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e503]:
                - generic [ref=e504]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e505]':
                    - img "midi-qol" [ref=e507] [cursor=pointer]
                    - generic [ref=e508]:
                      - generic [ref=e509]: midi-qol
                      - generic [ref=e510]: "To: Gamemaster"
                  - generic [ref=e511]:
                    - time [ref=e512]: 3m 16s ago
                    - text: 
                    - generic "Additional Controls" [ref=e513] [cursor=pointer]:
                      - generic [ref=e514]: 
                - generic [ref=e515]:
                  - heading "Warning" [level=3] [ref=e516]
                  - paragraph [ref=e517]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e518]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e519]:
                - generic [ref=e520]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e521]':
                    - img "midi-qol" [ref=e523] [cursor=pointer]
                    - generic [ref=e524]:
                      - generic [ref=e525]: midi-qol
                      - generic [ref=e526]: "To: Gamemaster"
                  - generic [ref=e527]:
                    - time [ref=e528]: 2m 6s ago
                    - text: 
                    - generic "Additional Controls" [ref=e529] [cursor=pointer]:
                      - generic [ref=e530]: 
                - generic [ref=e531]:
                  - heading "Warning" [level=3] [ref=e532]
                  - paragraph [ref=e533]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e534]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e535]:
                - generic [ref=e536]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e537]':
                    - img "midi-qol" [ref=e539] [cursor=pointer]
                    - generic [ref=e540]:
                      - generic [ref=e541]: midi-qol
                      - generic [ref=e542]: "To: Gamemaster"
                  - generic [ref=e543]:
                    - time [ref=e544]: 13s ago
                    - text: 
                    - generic "Additional Controls" [ref=e545] [cursor=pointer]:
                      - generic [ref=e546]: 
                - generic [ref=e547]:
                  - heading "Warning" [level=3] [ref=e548]
                  - paragraph [ref=e549]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e550]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
            - generic: 
          - text: +            +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +         +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +   +  +   +  +   +  +   +  +   +  +         +  +   +  +   +  +   +  +   +  +         +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +                     +  +              +  +  +                        +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +     +  +                               +  +   +  +                  +  +            +  +                  +  +                              +  +   +  +   +  +   +  +   +  +                  • • •            
  - figure:
    - generic:
      - img
      - generic: Game Paused
  - button "" [ref=e552] [cursor=pointer]:
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