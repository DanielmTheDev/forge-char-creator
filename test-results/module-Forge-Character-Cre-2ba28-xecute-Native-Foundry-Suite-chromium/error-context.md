# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: module.spec.js >> Forge Character Creator Test Suite >> Execute Native Foundry Suite
- Location: tests/module.spec.js:7:7

# Error details

```
Error: page.evaluate: Execution context was destroyed, most likely because of a navigation.
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
      - text: 
      - paragraph [ref=e7]: Foundry Virtual Tabletop requires a screen resolution of 1366px by 768px or greater. Your display has a resolution of 1280px by 720px. You must increase your resolution or use a different display device, or else some features of the software will not work properly.
      - text: 
    - listitem [ref=e8]:
      - text: 
      - paragraph [ref=e9]: Your web browser does not have hardware acceleration enabled. This will severely impair the performance of Foundry Virtual Tabletop and cause graphical errors and anomalies. Be sure to enable hardware acceleration in your browser settings.
      - text: 
  - generic [ref=e10]:
    - generic:
      - generic:
        - complementary:
          - list:
            - listitem:
              - tab "Token Controls" [ref=e11]: 
            - listitem:
              - tab "Measurement Controls" [ref=e12] [cursor=pointer]: 
            - listitem:
              - tab "Tile Controls" [ref=e13] [cursor=pointer]: 
            - listitem:
              - tab "Drawing Tools" [ref=e14] [cursor=pointer]: 
            - listitem:
              - tab "Wall Controls" [ref=e15] [cursor=pointer]: 
            - listitem:
              - tab "Lighting Controls" [ref=e16] [cursor=pointer]: 
            - listitem:
              - tab "Ambient Sound Controls" [ref=e17] [cursor=pointer]: 
            - listitem:
              - tab "Region Controls" [ref=e18] [cursor=pointer]: 
            - listitem:
              - tab "Journal Notes" [ref=e19] [cursor=pointer]: 
          - list:
            - listitem:
              - button "Select Tokens" [pressed] [ref=e20]: 
            - listitem:
              - button "Select Targets" [ref=e21] [cursor=pointer]: 
            - listitem:
              - button "Measure Distance" [ref=e22] [cursor=pointer]: 
            - listitem:
              - button "Unconstrained Movement" [ref=e23] [cursor=pointer]: 
        - complementary:
          - generic [ref=e24]:
            - list [ref=e25]:
              - listitem [ref=e26]:
                - generic [ref=e27]: Gamemaster [GM]
            - generic [ref=e28]:
              - generic [ref=e29]: Latency 1ms
              - generic [ref=e30]: FPS 16
              - button "" [ref=e31] [cursor=pointer]
      - generic:
        - navigation:
          - generic "Expand Navigation" [ref=e32] [cursor=pointer]:
            - generic: 
          - list:
            - listitem [ref=e33]:
              - generic [ref=e34]: Landing Page
              - list [ref=e35]:
                - listitem "Gamemaster" [ref=e36]: G
              - text: 
    - generic:
      - generic:
        - complementary:
          - generic:
            - button "Mute Volume" [ref=e37] [cursor=pointer]: 
            - button "Main Menu" [ref=e38] [cursor=pointer]: 
          - list [ref=e39]:
            - button "Display Aelrathil Entries" [ref=e40] [cursor=pointer]:
              - img "Display Aelrathil Entries"
              - generic: "1"
            - button "Empty Slot" [ref=e41] [cursor=pointer]:
              - generic: "2"
            - button "Empty Slot" [ref=e42] [cursor=pointer]:
              - generic: "3"
            - button "Empty Slot" [ref=e43] [cursor=pointer]:
              - generic: "4"
            - button "Empty Slot" [ref=e44] [cursor=pointer]:
              - generic: "5"
            - button "Empty Slot" [ref=e45] [cursor=pointer]:
              - generic: "6"
            - button "Deletes all templates" [ref=e46] [cursor=pointer]:
              - img "Deletes all templates"
              - generic: "7"
            - button "Show health bar and name" [ref=e47] [cursor=pointer]:
              - img "Show health bar and name"
              - generic: "8"
            - button "Empty Slot" [ref=e48] [cursor=pointer]:
              - generic: "9"
            - button "Empty Slot" [ref=e49] [cursor=pointer]:
              - generic: "0"
          - generic:
            - navigation:
              - button "Next Page" [ref=e50] [cursor=pointer]: 
              - generic: "1"
              - button "Previous Page" [ref=e51] [cursor=pointer]: 
            - generic:
              - button "Lock Hotbar" [ref=e52] [cursor=pointer]: 
              - button "Clear Hotbar" [ref=e53] [cursor=pointer]: 
    - generic:
      - generic:
        - generic:
          - generic:
            - list
          - textbox "Chat" [ref=e54]:
            - /placeholder: Enter message
          - generic:
            - generic:
              - button "Public Roll" [pressed] [ref=e55]: 
              - button "Private GM Roll" [ref=e56] [cursor=pointer]: 
              - button "Blind GM Roll" [ref=e57] [cursor=pointer]: 
              - button "Self Roll" [ref=e58] [cursor=pointer]: 
            - text:  
      - complementary:
        - tablist:
          - list [ref=e59]:
            - listitem [ref=e60]:
              - tab "Chat Messages" [ref=e61] [cursor=pointer]: 
            - listitem [ref=e62]:
              - tab "Combat Encounters" [ref=e63] [cursor=pointer]: 
            - listitem [ref=e64]:
              - tab "Scenes" [ref=e65] [cursor=pointer]: 
            - listitem [ref=e66]:
              - tab "Actors" [ref=e67] [cursor=pointer]: 
            - listitem [ref=e68]:
              - tab "Items" [ref=e69] [cursor=pointer]: 
            - listitem [ref=e70]:
              - tab "Journal" [ref=e71] [cursor=pointer]: 
            - listitem [ref=e72]:
              - tab "Rollable Tables" [ref=e73] [cursor=pointer]: 
            - listitem [ref=e74]:
              - tab "Card Stacks" [ref=e75] [cursor=pointer]: 
            - listitem [ref=e76]:
              - tab "Macros" [ref=e77] [cursor=pointer]: 
            - listitem [ref=e78]:
              - tab "Playlists" [ref=e79] [cursor=pointer]: 
            - listitem [ref=e80]:
              - tab "Compendium Packs" [ref=e81] [cursor=pointer]: 
            - listitem [ref=e82]:
              - tab "Game Settings" [ref=e83] [cursor=pointer]: 
            - listitem [ref=e84]:
              - button "Expand" [ref=e85] [cursor=pointer]: 
        - generic:
          - generic:
            - list [ref=e87]:
              - listitem [ref=e88]:
                - generic [ref=e89]:
                  - 'heading "after tyrn after tyrn To: Gamemaster" [level=4] [ref=e90]':
                    - img "after tyrn" [ref=e92] [cursor=pointer]
                    - generic [ref=e93]:
                      - generic [ref=e94]: after tyrn
                      - generic [ref=e95]: "To: Gamemaster"
                  - generic [ref=e96]:
                    - time [ref=e97]: 34d 1h ago
                    - text: 
                    - generic "Additional Controls" [ref=e98] [cursor=pointer]:
                      - generic [ref=e99]: 
                - generic [ref=e101]:
                  - generic [ref=e102]:
                    - generic [ref=e103] [cursor=pointer]:
                      - img "after turn" [ref=e104]
                      - generic [ref=e105]:
                        - generic [ref=e106]: after turn
                        - generic [ref=e107]: Feature
                      - generic [ref=e108]: 
                    - generic [ref=e110]: "[object Object]"
                  - generic [ref=e111]:
                    - generic [ref=e113]:
                      - generic [ref=e114]: Damage
                      - generic [ref=e116] [cursor=pointer]:
                        - generic [ref=e117]: "5"
                        - generic [ref=e119]:
                          - list [ref=e120]:
                            - listitem [ref=e121]: "+5"
                          - generic [ref=e122]:
                            - img "Fire" [ref=e123]
                            - generic [ref=e124]: Fire
                            - generic [ref=e125]: "5"
                        - heading "5 " [level=4] [ref=e126]
                    - list [ref=e128]:
                      - listitem [ref=e129]:
                        - generic [ref=e130]: Action
                      - listitem [ref=e131]:
                        - generic [ref=e132]: Instantaneous
                      - listitem [ref=e133]:
                        - generic [ref=e134]: Self
              - listitem [ref=e135]:
                - generic [ref=e136]:
                  - 'heading "after tyrn after tyrn To: Gamemaster" [level=4] [ref=e137]':
                    - img "after tyrn" [ref=e139] [cursor=pointer]
                    - generic [ref=e140]:
                      - generic [ref=e141]: after tyrn
                      - generic [ref=e142]: "To: Gamemaster"
                  - generic [ref=e143]:
                    - time [ref=e144]: 34d 1h ago
                    - text: 
                    - generic "Additional Controls" [ref=e145] [cursor=pointer]:
                      - generic [ref=e146]: 
                - generic [ref=e148]:
                  - generic [ref=e149]:
                    - generic [ref=e150] [cursor=pointer]:
                      - img "wer" [ref=e151]
                      - generic [ref=e152]:
                        - generic [ref=e153]: wer
                        - generic [ref=e154]: Feature
                      - generic [ref=e155]: 
                    - generic [ref=e157]: "[object Object]"
                  - generic [ref=e158]:
                    - button " DC 14 Dexterity Saving Throw" [ref=e161] [cursor=pointer]:
                      - generic: 
                      - generic: DC 14 Dexterity Saving Throw
                    - generic [ref=e162]:
                      - generic [ref=e163]:
                        - generic [ref=e164]: Damage
                        - generic [ref=e166] [cursor=pointer]:
                          - generic [ref=e167]: "5"
                          - generic [ref=e169]:
                            - list [ref=e170]:
                              - listitem [ref=e171]: "+5"
                            - generic [ref=e172]:
                              - img "Fire" [ref=e173]
                              - generic [ref=e174]: Fire
                              - generic [ref=e175]: "5"
                          - heading "5 " [level=4] [ref=e176]
                      - generic [ref=e178]:
                        - strong [ref=e180]: DC 14 Dexterity Saving Throw
                        - strong [ref=e182]: Damage 0
                        - list [ref=e183]:
                          - listitem [ref=e184] [cursor=pointer]:
                            - img [ref=e185]
                            - generic [ref=e188]: Dummy
                    - list [ref=e189]:
                      - listitem [ref=e190]:
                        - generic [ref=e191]: Action
                      - listitem [ref=e192]:
                        - generic [ref=e193]: Instantaneous
                      - listitem [ref=e194]:
                        - generic [ref=e195]: Self
              - listitem [ref=e196]:
                - generic [ref=e197]:
                  - 'heading "Gamemaster Gamemaster To: Gamemaster" [level=4] [ref=e198]':
                    - img "Gamemaster" [ref=e200] [cursor=pointer]
                    - generic [ref=e201]:
                      - generic [ref=e202]: Gamemaster
                      - generic [ref=e203]: "To: Gamemaster"
                  - generic [ref=e204]:
                    - time [ref=e205]: 34d 1h ago
                    - text: 
                    - generic "Additional Controls" [ref=e206] [cursor=pointer]:
                      - generic [ref=e207]: 
                - generic [ref=e209]:
                  - generic [ref=e210]:
                    - generic [ref=e211]: 
                    - text: HP Updated
                  - generic [ref=e214]:
                    - img [ref=e215]
                    - generic [ref=e216]: "-5"
                    - text:  
                    - generic [ref=e217]:
                      - generic [ref=e218]: 
                      - text: "4930"
                      - generic [ref=e219]: 
                      - text: "4925"
                    - text:    
                    - generic [ref=e220]:
                      - combobox [ref=e221] [cursor=pointer]:
                        - option "=" [selected]
                        - option "1"
                        - option "½"
                        - option "2"
                        - option "¼"
                        - option "+"
                      - generic [ref=e222]:
                        - button "" [ref=e223] [cursor=pointer]:
                          - generic: 
                        - button "" [ref=e224] [cursor=pointer]:
                          - generic: 
              - listitem [ref=e225]:
                - generic [ref=e226]:
                  - 'heading "after tyrn after tyrn To: Gamemaster" [level=4] [ref=e227]':
                    - img "after tyrn" [ref=e229] [cursor=pointer]
                    - generic [ref=e230]:
                      - generic [ref=e231]: after tyrn
                      - generic [ref=e232]: "To: Gamemaster"
                  - generic [ref=e233]:
                    - time [ref=e234]: 34d 1h ago
                    - text: 
                    - generic "Additional Controls" [ref=e235] [cursor=pointer]:
                      - generic [ref=e236]: 
                - generic [ref=e238]:
                  - generic [ref=e239]:
                    - generic [ref=e240] [cursor=pointer]:
                      - img "after turn" [ref=e241]
                      - generic [ref=e242]:
                        - generic [ref=e243]: after turn
                        - generic [ref=e244]: Feature
                      - generic [ref=e245]: 
                    - generic [ref=e247]: "[object Object]"
                  - generic [ref=e248]:
                    - generic [ref=e250]:
                      - generic [ref=e251]: Damage
                      - generic [ref=e253] [cursor=pointer]:
                        - generic [ref=e254]: "5"
                        - generic [ref=e256]:
                          - list [ref=e257]:
                            - listitem [ref=e258]: "+5"
                          - generic [ref=e259]:
                            - img "Fire" [ref=e260]
                            - generic [ref=e261]: Fire
                            - generic [ref=e262]: "5"
                        - heading "5 " [level=4] [ref=e263]
                    - list [ref=e265]:
                      - listitem [ref=e266]:
                        - generic [ref=e267]: Action
                      - listitem [ref=e268]:
                        - generic [ref=e269]: Instantaneous
                      - listitem [ref=e270]:
                        - generic [ref=e271]: Self
              - listitem [ref=e272]:
                - generic [ref=e273]:
                  - 'heading "Gamemaster Gamemaster To: Gamemaster" [level=4] [ref=e274]':
                    - img "Gamemaster" [ref=e276] [cursor=pointer]
                    - generic [ref=e277]:
                      - generic [ref=e278]: Gamemaster
                      - generic [ref=e279]: "To: Gamemaster"
                  - generic [ref=e280]:
                    - time [ref=e281]: 34d 1h ago
                    - text: 
                    - generic "Additional Controls" [ref=e282] [cursor=pointer]:
                      - generic [ref=e283]: 
                - generic [ref=e285]:
                  - generic [ref=e286]:
                    - generic [ref=e287]: 
                    - text: HP Updated
                  - generic [ref=e290]:
                    - img [ref=e291]
                    - text:        
                    - generic [ref=e292]: (0)
                    - generic [ref=e293]:
                      - combobox [ref=e294] [cursor=pointer]:
                        - option "=" [selected]
                        - option "1"
                        - option "½"
                        - option "2"
                        - option "¼"
                        - option "+"
                      - generic [ref=e295]:
                        - button "" [ref=e296] [cursor=pointer]:
                          - generic: 
                        - button "" [ref=e297] [cursor=pointer]:
                          - generic: 
              - listitem [ref=e298]:
                - generic [ref=e299]:
                  - 'heading "after tyrn after tyrn To: Gamemaster" [level=4] [ref=e300]':
                    - img "after tyrn" [ref=e302] [cursor=pointer]
                    - generic [ref=e303]:
                      - generic [ref=e304]: after tyrn
                      - generic [ref=e305]: "To: Gamemaster"
                  - generic [ref=e306]:
                    - time [ref=e307]: 34d 1h ago
                    - text: 
                    - generic "Additional Controls" [ref=e308] [cursor=pointer]:
                      - generic [ref=e309]: 
                - generic [ref=e311]:
                  - generic [ref=e312]:
                    - generic [ref=e313] [cursor=pointer]:
                      - img "wer" [ref=e314]
                      - generic [ref=e315]:
                        - generic [ref=e316]: wer
                        - generic [ref=e317]: Feature
                      - generic [ref=e318]: 
                    - generic [ref=e320]: "[object Object]"
                  - generic [ref=e321]:
                    - generic [ref=e322]:
                      - generic [ref=e323]:
                        - generic [ref=e324]: Damage
                        - generic [ref=e326] [cursor=pointer]:
                          - generic [ref=e327]: "5"
                          - generic [ref=e329]:
                            - list [ref=e330]:
                              - listitem [ref=e331]: "+5"
                            - generic [ref=e332]:
                              - img "Fire" [ref=e333]
                              - generic [ref=e334]: Fire
                              - generic [ref=e335]: "5"
                          - heading "5 " [level=4] [ref=e336]
                      - generic [ref=e338]:
                        - strong [ref=e340]: DC 14 Dexterity Saving Throw
                        - strong [ref=e342]: Damage 0
                        - list [ref=e343]:
                          - listitem [ref=e344] [cursor=pointer]:
                            - generic [ref=e345]: 
                            - img [ref=e346]
                            - generic [ref=e349]: Dummy
                            - generic [ref=e351]: "14"
                    - list [ref=e352]:
                      - listitem [ref=e353]:
                        - generic [ref=e354]: Action
                      - listitem [ref=e355]:
                        - generic [ref=e356]: Instantaneous
                      - listitem [ref=e357]:
                        - generic [ref=e358]: Self
              - listitem [ref=e359]:
                - generic [ref=e360]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e361]':
                    - img "midi-qol" [ref=e363] [cursor=pointer]
                    - generic [ref=e364]:
                      - generic [ref=e365]: midi-qol
                      - generic [ref=e366]: "To: Gamemaster"
                  - generic [ref=e367]:
                    - time [ref=e368]: 34d 1h ago
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
                    - time [ref=e384]: 34d 46m ago
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
                    - time [ref=e400]: 34d 45m ago
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
                    - time [ref=e416]: 33d 11h ago
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
                    - time [ref=e432]: 33d 7h ago
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
                    - time [ref=e448]: 33d 7h ago
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
                    - time [ref=e464]: 33d 7h ago
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
                    - time [ref=e480]: 33d 6h ago
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
                    - time [ref=e496]: 33d 6h ago
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
                    - time [ref=e512]: 23d 6h ago
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
                    - time [ref=e528]: 23d 5h ago
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
                    - time [ref=e544]: 23d 5h ago
                    - text: 
                    - generic "Additional Controls" [ref=e545] [cursor=pointer]:
                      - generic [ref=e546]: 
                - generic [ref=e547]:
                  - heading "Warning" [level=3] [ref=e548]
                  - paragraph [ref=e549]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e550]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e551]:
                - generic [ref=e552]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e553]':
                    - img "midi-qol" [ref=e555] [cursor=pointer]
                    - generic [ref=e556]:
                      - generic [ref=e557]: midi-qol
                      - generic [ref=e558]: "To: Gamemaster"
                  - generic [ref=e559]:
                    - time [ref=e560]: 23d 4h ago
                    - text: 
                    - generic "Additional Controls" [ref=e561] [cursor=pointer]:
                      - generic [ref=e562]: 
                - generic [ref=e563]:
                  - heading "Warning" [level=3] [ref=e564]
                  - paragraph [ref=e565]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e566]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e567]:
                - generic [ref=e568]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e569]':
                    - img "midi-qol" [ref=e571] [cursor=pointer]
                    - generic [ref=e572]:
                      - generic [ref=e573]: midi-qol
                      - generic [ref=e574]: "To: Gamemaster"
                  - generic [ref=e575]:
                    - time [ref=e576]: 23d 3h ago
                    - text: 
                    - generic "Additional Controls" [ref=e577] [cursor=pointer]:
                      - generic [ref=e578]: 
                - generic [ref=e579]:
                  - heading "Warning" [level=3] [ref=e580]
                  - paragraph [ref=e581]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e582]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e583]:
                - generic [ref=e584]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e585]':
                    - img "midi-qol" [ref=e587] [cursor=pointer]
                    - generic [ref=e588]:
                      - generic [ref=e589]: midi-qol
                      - generic [ref=e590]: "To: Gamemaster"
                  - generic [ref=e591]:
                    - time [ref=e592]: 23d 3h ago
                    - text: 
                    - generic "Additional Controls" [ref=e593] [cursor=pointer]:
                      - generic [ref=e594]: 
                - generic [ref=e595]:
                  - heading "Warning" [level=3] [ref=e596]
                  - paragraph [ref=e597]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e598]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e599]:
                - generic [ref=e600]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e601]':
                    - img "midi-qol" [ref=e603] [cursor=pointer]
                    - generic [ref=e604]:
                      - generic [ref=e605]: midi-qol
                      - generic [ref=e606]: "To: Gamemaster"
                  - generic [ref=e607]:
                    - time [ref=e608]: 23d 2h ago
                    - text: 
                    - generic "Additional Controls" [ref=e609] [cursor=pointer]:
                      - generic [ref=e610]: 
                - generic [ref=e611]:
                  - heading "Warning" [level=3] [ref=e612]
                  - paragraph [ref=e613]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e614]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e615]:
                - generic [ref=e616]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e617]':
                    - img "midi-qol" [ref=e619] [cursor=pointer]
                    - generic [ref=e620]:
                      - generic [ref=e621]: midi-qol
                      - generic [ref=e622]: "To: Gamemaster"
                  - generic [ref=e623]:
                    - time [ref=e624]: 23d 1h ago
                    - text: 
                    - generic "Additional Controls" [ref=e625] [cursor=pointer]:
                      - generic [ref=e626]: 
                - generic [ref=e627]:
                  - heading "Warning" [level=3] [ref=e628]
                  - paragraph [ref=e629]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e630]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e631]:
                - generic [ref=e632]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e633]':
                    - img "midi-qol" [ref=e635] [cursor=pointer]
                    - generic [ref=e636]:
                      - generic [ref=e637]: midi-qol
                      - generic [ref=e638]: "To: Gamemaster"
                  - generic [ref=e639]:
                    - time [ref=e640]: 4m 54s ago
                    - text: 
                    - generic "Additional Controls" [ref=e641] [cursor=pointer]:
                      - generic [ref=e642]: 
                - generic [ref=e643]:
                  - heading "Warning" [level=3] [ref=e644]
                  - paragraph [ref=e645]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e646]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e647]:
                - generic [ref=e648]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e649]':
                    - img "midi-qol" [ref=e651] [cursor=pointer]
                    - generic [ref=e652]:
                      - generic [ref=e653]: midi-qol
                      - generic [ref=e654]: "To: Gamemaster"
                  - generic [ref=e655]:
                    - time [ref=e656]: 4m 1s ago
                    - text: 
                    - generic "Additional Controls" [ref=e657] [cursor=pointer]:
                      - generic [ref=e658]: 
                - generic [ref=e659]:
                  - heading "Warning" [level=3] [ref=e660]
                  - paragraph [ref=e661]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e662]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e663]:
                - generic [ref=e664]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e665]':
                    - img "midi-qol" [ref=e667] [cursor=pointer]
                    - generic [ref=e668]:
                      - generic [ref=e669]: midi-qol
                      - generic [ref=e670]: "To: Gamemaster"
                  - generic [ref=e671]:
                    - time [ref=e672]: 13s ago
                    - text: 
                    - generic "Additional Controls" [ref=e673] [cursor=pointer]:
                      - generic [ref=e674]: 
                - generic [ref=e675]:
                  - heading "Warning" [level=3] [ref=e676]
                  - paragraph [ref=e677]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e678]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
            - generic: 
          - text: +            +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +         +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +   +  +   +  +   +  +   +  +   +  +         +  +   +  +   +  +   +  +   +  +         +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +                     +  +              +  +  +                        +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +     +  +                               +  +   +  +                  +  +            +  +                  +  +                              +  +   +  +   +  +   +  +   +  +                  • • •            
  - figure:
    - generic:
      - img
      - generic: Game Paused
  - button "" [ref=e680] [cursor=pointer]:
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
> 48 |     const result = await page.evaluate(async () => {
     |                               ^ Error: page.evaluate: Execution context was destroyed, most likely because of a navigation.
  49 |       if (typeof ForgeTestingSuite === 'undefined') {
  50 |         return { success: false, error: "ForgeTestingSuite not found. Is the module active?" };
  51 |       }
  52 |       
  53 |       try {
  54 |         // Suppress visual groupings in headless terminal, keep logs
  55 |         console.group = console.log;
  56 |         console.groupEnd = () => {};
  57 |         
  58 |         await ForgeTestingSuite.runAll();
  59 |         return { success: true };
  60 |       } catch (err) {
  61 |         return { success: false, error: err.message };
  62 |       }
  63 |     });
  64 | 
  65 |     // 6. Assert success
  66 |     expect(result.success, `Foundry test suite failed: ${result.error}`).toBeTruthy();
  67 |   });
  68 | });
  69 | 
```