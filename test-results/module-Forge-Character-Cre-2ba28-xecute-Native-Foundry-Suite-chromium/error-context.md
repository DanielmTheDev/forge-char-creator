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
              - generic [ref=e32]: FPS 14
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
                  - 'heading "Gamemaster Gamemaster To: Gamemaster" [level=4] [ref=e92]':
                    - img "Gamemaster" [ref=e94] [cursor=pointer]
                    - generic [ref=e95]:
                      - generic [ref=e96]: Gamemaster
                      - generic [ref=e97]: "To: Gamemaster"
                  - generic [ref=e98]:
                    - time [ref=e99]: 34d 1h ago
                    - text: 
                    - generic "Additional Controls" [ref=e100] [cursor=pointer]:
                      - generic [ref=e101]: 
                - generic [ref=e103]:
                  - generic [ref=e104]:
                    - generic [ref=e105]: 
                    - text: HP Updated
                  - generic [ref=e108]:
                    - img [ref=e109]
                    - generic [ref=e110]: "-5"
                    - text:  
                    - generic [ref=e111]:
                      - generic [ref=e112]: 
                      - text: "4930"
                      - generic [ref=e113]: 
                      - text: "4925"
                    - text:    
                    - generic [ref=e114]:
                      - combobox [ref=e115] [cursor=pointer]:
                        - option "=" [selected]
                        - option "1"
                        - option "½"
                        - option "2"
                        - option "¼"
                        - option "+"
                      - generic [ref=e116]:
                        - button "" [ref=e117] [cursor=pointer]:
                          - generic: 
                        - button "" [ref=e118] [cursor=pointer]:
                          - generic: 
              - listitem [ref=e119]:
                - generic [ref=e120]:
                  - 'heading "after tyrn after tyrn To: Gamemaster" [level=4] [ref=e121]':
                    - img "after tyrn" [ref=e123] [cursor=pointer]
                    - generic [ref=e124]:
                      - generic [ref=e125]: after tyrn
                      - generic [ref=e126]: "To: Gamemaster"
                  - generic [ref=e127]:
                    - time [ref=e128]: 34d 1h ago
                    - text: 
                    - generic "Additional Controls" [ref=e129] [cursor=pointer]:
                      - generic [ref=e130]: 
                - generic [ref=e132]:
                  - generic [ref=e133]:
                    - generic [ref=e134] [cursor=pointer]:
                      - img "after turn" [ref=e135]
                      - generic [ref=e136]:
                        - generic [ref=e137]: after turn
                        - generic [ref=e138]: Feature
                      - generic [ref=e139]: 
                    - generic [ref=e141]: "[object Object]"
                  - generic [ref=e142]:
                    - generic [ref=e144]:
                      - generic [ref=e145]: Damage
                      - generic [ref=e147] [cursor=pointer]:
                        - generic [ref=e148]: "5"
                        - generic [ref=e150]:
                          - list [ref=e151]:
                            - listitem [ref=e152]: "+5"
                          - generic [ref=e153]:
                            - img "Fire" [ref=e154]
                            - generic [ref=e155]: Fire
                            - generic [ref=e156]: "5"
                        - heading "5 " [level=4] [ref=e157]
                    - list [ref=e159]:
                      - listitem [ref=e160]:
                        - generic [ref=e161]: Action
                      - listitem [ref=e162]:
                        - generic [ref=e163]: Instantaneous
                      - listitem [ref=e164]:
                        - generic [ref=e165]: Self
              - listitem [ref=e166]:
                - generic [ref=e167]:
                  - 'heading "Gamemaster Gamemaster To: Gamemaster" [level=4] [ref=e168]':
                    - img "Gamemaster" [ref=e170] [cursor=pointer]
                    - generic [ref=e171]:
                      - generic [ref=e172]: Gamemaster
                      - generic [ref=e173]: "To: Gamemaster"
                  - generic [ref=e174]:
                    - time [ref=e175]: 34d 1h ago
                    - text: 
                    - generic "Additional Controls" [ref=e176] [cursor=pointer]:
                      - generic [ref=e177]: 
                - generic [ref=e179]:
                  - generic [ref=e180]:
                    - generic [ref=e181]: 
                    - text: HP Updated
                  - generic [ref=e184]:
                    - img [ref=e185]
                    - text:        
                    - generic [ref=e186]: (0)
                    - generic [ref=e187]:
                      - combobox [ref=e188] [cursor=pointer]:
                        - option "=" [selected]
                        - option "1"
                        - option "½"
                        - option "2"
                        - option "¼"
                        - option "+"
                      - generic [ref=e189]:
                        - button "" [ref=e190] [cursor=pointer]:
                          - generic: 
                        - button "" [ref=e191] [cursor=pointer]:
                          - generic: 
              - listitem [ref=e192]:
                - generic [ref=e193]:
                  - 'heading "after tyrn after tyrn To: Gamemaster" [level=4] [ref=e194]':
                    - img "after tyrn" [ref=e196] [cursor=pointer]
                    - generic [ref=e197]:
                      - generic [ref=e198]: after tyrn
                      - generic [ref=e199]: "To: Gamemaster"
                  - generic [ref=e200]:
                    - time [ref=e201]: 34d 1h ago
                    - text: 
                    - generic "Additional Controls" [ref=e202] [cursor=pointer]:
                      - generic [ref=e203]: 
                - generic [ref=e205]:
                  - generic [ref=e206]:
                    - generic [ref=e207] [cursor=pointer]:
                      - img "wer" [ref=e208]
                      - generic [ref=e209]:
                        - generic [ref=e210]: wer
                        - generic [ref=e211]: Feature
                      - generic [ref=e212]: 
                    - generic [ref=e214]: "[object Object]"
                  - generic [ref=e215]:
                    - generic [ref=e216]:
                      - generic [ref=e217]:
                        - generic [ref=e218]: Damage
                        - generic [ref=e220] [cursor=pointer]:
                          - generic [ref=e221]: "5"
                          - generic [ref=e223]:
                            - list [ref=e224]:
                              - listitem [ref=e225]: "+5"
                            - generic [ref=e226]:
                              - img "Fire" [ref=e227]
                              - generic [ref=e228]: Fire
                              - generic [ref=e229]: "5"
                          - heading "5 " [level=4] [ref=e230]
                      - generic [ref=e232]:
                        - strong [ref=e234]: DC 14 Dexterity Saving Throw
                        - strong [ref=e236]: Damage 0
                        - list [ref=e237]:
                          - listitem [ref=e238] [cursor=pointer]:
                            - generic [ref=e239]: 
                            - img [ref=e240]
                            - generic [ref=e243]: Dummy
                            - generic [ref=e245]: "14"
                    - list [ref=e246]:
                      - listitem [ref=e247]:
                        - generic [ref=e248]: Action
                      - listitem [ref=e249]:
                        - generic [ref=e250]: Instantaneous
                      - listitem [ref=e251]:
                        - generic [ref=e252]: Self
              - listitem [ref=e253]:
                - generic [ref=e254]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e255]':
                    - img "midi-qol" [ref=e257] [cursor=pointer]
                    - generic [ref=e258]:
                      - generic [ref=e259]: midi-qol
                      - generic [ref=e260]: "To: Gamemaster"
                  - generic [ref=e261]:
                    - time [ref=e262]: 34d 1h ago
                    - text: 
                    - generic "Additional Controls" [ref=e263] [cursor=pointer]:
                      - generic [ref=e264]: 
                - generic [ref=e265]:
                  - heading "Warning" [level=3] [ref=e266]
                  - paragraph [ref=e267]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e268]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e269]:
                - generic [ref=e270]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e271]':
                    - img "midi-qol" [ref=e273] [cursor=pointer]
                    - generic [ref=e274]:
                      - generic [ref=e275]: midi-qol
                      - generic [ref=e276]: "To: Gamemaster"
                  - generic [ref=e277]:
                    - time [ref=e278]: 34d 57m ago
                    - text: 
                    - generic "Additional Controls" [ref=e279] [cursor=pointer]:
                      - generic [ref=e280]: 
                - generic [ref=e281]:
                  - heading "Warning" [level=3] [ref=e282]
                  - paragraph [ref=e283]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e284]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e285]:
                - generic [ref=e286]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e287]':
                    - img "midi-qol" [ref=e289] [cursor=pointer]
                    - generic [ref=e290]:
                      - generic [ref=e291]: midi-qol
                      - generic [ref=e292]: "To: Gamemaster"
                  - generic [ref=e293]:
                    - time [ref=e294]: 34d 55m ago
                    - text: 
                    - generic "Additional Controls" [ref=e295] [cursor=pointer]:
                      - generic [ref=e296]: 
                - generic [ref=e297]:
                  - heading "Warning" [level=3] [ref=e298]
                  - paragraph [ref=e299]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e300]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e301]:
                - generic [ref=e302]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e303]':
                    - img "midi-qol" [ref=e305] [cursor=pointer]
                    - generic [ref=e306]:
                      - generic [ref=e307]: midi-qol
                      - generic [ref=e308]: "To: Gamemaster"
                  - generic [ref=e309]:
                    - time [ref=e310]: 33d 11h ago
                    - text: 
                    - generic "Additional Controls" [ref=e311] [cursor=pointer]:
                      - generic [ref=e312]: 
                - generic [ref=e313]:
                  - heading "Warning" [level=3] [ref=e314]
                  - paragraph [ref=e315]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e316]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e317]:
                - generic [ref=e318]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e319]':
                    - img "midi-qol" [ref=e321] [cursor=pointer]
                    - generic [ref=e322]:
                      - generic [ref=e323]: midi-qol
                      - generic [ref=e324]: "To: Gamemaster"
                  - generic [ref=e325]:
                    - time [ref=e326]: 33d 8h ago
                    - text: 
                    - generic "Additional Controls" [ref=e327] [cursor=pointer]:
                      - generic [ref=e328]: 
                - generic [ref=e329]:
                  - heading "Warning" [level=3] [ref=e330]
                  - paragraph [ref=e331]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e332]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e333]:
                - generic [ref=e334]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e335]':
                    - img "midi-qol" [ref=e337] [cursor=pointer]
                    - generic [ref=e338]:
                      - generic [ref=e339]: midi-qol
                      - generic [ref=e340]: "To: Gamemaster"
                  - generic [ref=e341]:
                    - time [ref=e342]: 33d 7h ago
                    - text: 
                    - generic "Additional Controls" [ref=e343] [cursor=pointer]:
                      - generic [ref=e344]: 
                - generic [ref=e345]:
                  - heading "Warning" [level=3] [ref=e346]
                  - paragraph [ref=e347]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e348]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e349]:
                - generic [ref=e350]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e351]':
                    - img "midi-qol" [ref=e353] [cursor=pointer]
                    - generic [ref=e354]:
                      - generic [ref=e355]: midi-qol
                      - generic [ref=e356]: "To: Gamemaster"
                  - generic [ref=e357]:
                    - time [ref=e358]: 33d 7h ago
                    - text: 
                    - generic "Additional Controls" [ref=e359] [cursor=pointer]:
                      - generic [ref=e360]: 
                - generic [ref=e361]:
                  - heading "Warning" [level=3] [ref=e362]
                  - paragraph [ref=e363]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e364]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e365]:
                - generic [ref=e366]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e367]':
                    - img "midi-qol" [ref=e369] [cursor=pointer]
                    - generic [ref=e370]:
                      - generic [ref=e371]: midi-qol
                      - generic [ref=e372]: "To: Gamemaster"
                  - generic [ref=e373]:
                    - time [ref=e374]: 33d 7h ago
                    - text: 
                    - generic "Additional Controls" [ref=e375] [cursor=pointer]:
                      - generic [ref=e376]: 
                - generic [ref=e377]:
                  - heading "Warning" [level=3] [ref=e378]
                  - paragraph [ref=e379]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e380]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e381]:
                - generic [ref=e382]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e383]':
                    - img "midi-qol" [ref=e385] [cursor=pointer]
                    - generic [ref=e386]:
                      - generic [ref=e387]: midi-qol
                      - generic [ref=e388]: "To: Gamemaster"
                  - generic [ref=e389]:
                    - time [ref=e390]: 33d 6h ago
                    - text: 
                    - generic "Additional Controls" [ref=e391] [cursor=pointer]:
                      - generic [ref=e392]: 
                - generic [ref=e393]:
                  - heading "Warning" [level=3] [ref=e394]
                  - paragraph [ref=e395]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e396]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e397]:
                - generic [ref=e398]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e399]':
                    - img "midi-qol" [ref=e401] [cursor=pointer]
                    - generic [ref=e402]:
                      - generic [ref=e403]: midi-qol
                      - generic [ref=e404]: "To: Gamemaster"
                  - generic [ref=e405]:
                    - time [ref=e406]: 23d 6h ago
                    - text: 
                    - generic "Additional Controls" [ref=e407] [cursor=pointer]:
                      - generic [ref=e408]: 
                - generic [ref=e409]:
                  - heading "Warning" [level=3] [ref=e410]
                  - paragraph [ref=e411]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e412]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e413]:
                - generic [ref=e414]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e415]':
                    - img "midi-qol" [ref=e417] [cursor=pointer]
                    - generic [ref=e418]:
                      - generic [ref=e419]: midi-qol
                      - generic [ref=e420]: "To: Gamemaster"
                  - generic [ref=e421]:
                    - time [ref=e422]: 23d 6h ago
                    - text: 
                    - generic "Additional Controls" [ref=e423] [cursor=pointer]:
                      - generic [ref=e424]: 
                - generic [ref=e425]:
                  - heading "Warning" [level=3] [ref=e426]
                  - paragraph [ref=e427]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e428]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e429]:
                - generic [ref=e430]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e431]':
                    - img "midi-qol" [ref=e433] [cursor=pointer]
                    - generic [ref=e434]:
                      - generic [ref=e435]: midi-qol
                      - generic [ref=e436]: "To: Gamemaster"
                  - generic [ref=e437]:
                    - time [ref=e438]: 23d 5h ago
                    - text: 
                    - generic "Additional Controls" [ref=e439] [cursor=pointer]:
                      - generic [ref=e440]: 
                - generic [ref=e441]:
                  - heading "Warning" [level=3] [ref=e442]
                  - paragraph [ref=e443]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e444]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e445]:
                - generic [ref=e446]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e447]':
                    - img "midi-qol" [ref=e449] [cursor=pointer]
                    - generic [ref=e450]:
                      - generic [ref=e451]: midi-qol
                      - generic [ref=e452]: "To: Gamemaster"
                  - generic [ref=e453]:
                    - time [ref=e454]: 23d 4h ago
                    - text: 
                    - generic "Additional Controls" [ref=e455] [cursor=pointer]:
                      - generic [ref=e456]: 
                - generic [ref=e457]:
                  - heading "Warning" [level=3] [ref=e458]
                  - paragraph [ref=e459]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e460]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e461]:
                - generic [ref=e462]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e463]':
                    - img "midi-qol" [ref=e465] [cursor=pointer]
                    - generic [ref=e466]:
                      - generic [ref=e467]: midi-qol
                      - generic [ref=e468]: "To: Gamemaster"
                  - generic [ref=e469]:
                    - time [ref=e470]: 23d 3h ago
                    - text: 
                    - generic "Additional Controls" [ref=e471] [cursor=pointer]:
                      - generic [ref=e472]: 
                - generic [ref=e473]:
                  - heading "Warning" [level=3] [ref=e474]
                  - paragraph [ref=e475]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e476]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e477]:
                - generic [ref=e478]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e479]':
                    - img "midi-qol" [ref=e481] [cursor=pointer]
                    - generic [ref=e482]:
                      - generic [ref=e483]: midi-qol
                      - generic [ref=e484]: "To: Gamemaster"
                  - generic [ref=e485]:
                    - time [ref=e486]: 23d 3h ago
                    - text: 
                    - generic "Additional Controls" [ref=e487] [cursor=pointer]:
                      - generic [ref=e488]: 
                - generic [ref=e489]:
                  - heading "Warning" [level=3] [ref=e490]
                  - paragraph [ref=e491]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e492]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e493]:
                - generic [ref=e494]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e495]':
                    - img "midi-qol" [ref=e497] [cursor=pointer]
                    - generic [ref=e498]:
                      - generic [ref=e499]: midi-qol
                      - generic [ref=e500]: "To: Gamemaster"
                  - generic [ref=e501]:
                    - time [ref=e502]: 23d 2h ago
                    - text: 
                    - generic "Additional Controls" [ref=e503] [cursor=pointer]:
                      - generic [ref=e504]: 
                - generic [ref=e505]:
                  - heading "Warning" [level=3] [ref=e506]
                  - paragraph [ref=e507]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e508]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e509]:
                - generic [ref=e510]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e511]':
                    - img "midi-qol" [ref=e513] [cursor=pointer]
                    - generic [ref=e514]:
                      - generic [ref=e515]: midi-qol
                      - generic [ref=e516]: "To: Gamemaster"
                  - generic [ref=e517]:
                    - time [ref=e518]: 23d 1h ago
                    - text: 
                    - generic "Additional Controls" [ref=e519] [cursor=pointer]:
                      - generic [ref=e520]: 
                - generic [ref=e521]:
                  - heading "Warning" [level=3] [ref=e522]
                  - paragraph [ref=e523]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e524]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e525]:
                - generic [ref=e526]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e527]':
                    - img "midi-qol" [ref=e529] [cursor=pointer]
                    - generic [ref=e530]:
                      - generic [ref=e531]: midi-qol
                      - generic [ref=e532]: "To: Gamemaster"
                  - generic [ref=e533]:
                    - time [ref=e534]: 15m 10s ago
                    - text: 
                    - generic "Additional Controls" [ref=e535] [cursor=pointer]:
                      - generic [ref=e536]: 
                - generic [ref=e537]:
                  - heading "Warning" [level=3] [ref=e538]
                  - paragraph [ref=e539]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e540]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e541]:
                - generic [ref=e542]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e543]':
                    - img "midi-qol" [ref=e545] [cursor=pointer]
                    - generic [ref=e546]:
                      - generic [ref=e547]: midi-qol
                      - generic [ref=e548]: "To: Gamemaster"
                  - generic [ref=e549]:
                    - time [ref=e550]: 14m 17s ago
                    - text: 
                    - generic "Additional Controls" [ref=e551] [cursor=pointer]:
                      - generic [ref=e552]: 
                - generic [ref=e553]:
                  - heading "Warning" [level=3] [ref=e554]
                  - paragraph [ref=e555]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e556]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e557]:
                - generic [ref=e558]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e559]':
                    - img "midi-qol" [ref=e561] [cursor=pointer]
                    - generic [ref=e562]:
                      - generic [ref=e563]: midi-qol
                      - generic [ref=e564]: "To: Gamemaster"
                  - generic [ref=e565]:
                    - time [ref=e566]: 10m 30s ago
                    - text: 
                    - generic "Additional Controls" [ref=e567] [cursor=pointer]:
                      - generic [ref=e568]: 
                - generic [ref=e569]:
                  - heading "Warning" [level=3] [ref=e570]
                  - paragraph [ref=e571]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e572]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e573]:
                - generic [ref=e574]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e575]':
                    - img "midi-qol" [ref=e577] [cursor=pointer]
                    - generic [ref=e578]:
                      - generic [ref=e579]: midi-qol
                      - generic [ref=e580]: "To: Gamemaster"
                  - generic [ref=e581]:
                    - time [ref=e582]: 56s ago
                    - text: 
                    - generic "Additional Controls" [ref=e583] [cursor=pointer]:
                      - generic [ref=e584]: 
                - generic [ref=e585]:
                  - heading "Warning" [level=3] [ref=e586]
                  - paragraph [ref=e587]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e588]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
              - listitem [ref=e589]:
                - generic [ref=e590]:
                  - 'heading "midi-qol midi-qol To: Gamemaster" [level=4] [ref=e591]':
                    - img "midi-qol" [ref=e593] [cursor=pointer]
                    - generic [ref=e594]:
                      - generic [ref=e595]: midi-qol
                      - generic [ref=e596]: "To: Gamemaster"
                  - generic [ref=e597]:
                    - time [ref=e598]: 13s ago
                    - text: 
                    - generic "Additional Controls" [ref=e599] [cursor=pointer]:
                      - generic [ref=e600]: 
                - generic [ref=e601]:
                  - heading "Warning" [level=3] [ref=e602]
                  - paragraph [ref=e603]: Midi-qol's built-in chat log pruning is deprecated. It will be removed in version 13.1.
                  - paragraph [ref=e604]: Please install and activate the 'chatlog-prune' module. Remember to activate chat log pruning in the module settings.
            - generic: 
          - text: +            +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +         +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +   +  +   +  +   +  +   +  +   +  +         +  +   +  +   +  +   +  +   +  +         +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +                     +  +              +  +  +                        +  +   +  +   +  +   +  +   +  +   +  +   +  +   +  +     +  +                               +  +   +  +                  +  +            +  +                  +  +                              +  +   +  +   +  +   +  +   +  +                  • • •            
  - figure:
    - generic:
      - img
      - generic: Game Paused
  - button "" [ref=e606] [cursor=pointer]:
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