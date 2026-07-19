# AETHON: The Killer 90-Second Demo & Rehearsal Script

*This is the script for recording the fallback demo video, and for the live dress rehearsal with the judges.*

## Setup Before Recording/Presenting
1. Ensure the AETHON frontend is running on `:3000`.
2. Ensure the FastAPI backend is running locally (it uses the Mistral API for LLM/embeddings).
3. Have two PDFs ready on your desktop: `Factory_Act_1948.pdf` and `SOP-44.pdf` (Confined Space Entry).
4. Clear any previous chat history in the Copilot UI.

---

## ⏱️ The 90-Second Script

### Part 1: Ingestion (0:00 - 0:20)
* **Action:** Open the AETHON web UI and go to the "Upload" tab. Drag and drop the `Factory_Act_1948.pdf` and `SOP-44.pdf`.
* **Voiceover:** *"Welcome to AETHON. To show you how this works, we are uploading a real, messy industrial document—the Factory Act of 1948—alongside our plant's standard operating procedure (SOP-44) for Confined Space Entry. In the background, AETHON is reading, chunking, and extracting entities into our Knowledge Graph."*

### Part 2: The Copilot Query (0:20 - 0:50)
* **Action:** Switch to the "Copilot" tab.
* **Action:** Type in the chat box: `"Does our SOP-44 procedure comply with the confined-space entry laws in the Factory Act?"` and hit enter.
* **Voiceover:** *"Let's ask the copilot a hard compliance question that usually takes an engineer hours to verify manually. Notice the typing indicator—AETHON is retrieving the context and reasoning over the data."*

### Part 3: The Big Reveal (0:50 - 1:15)
* **Action:** The response loads. Highlight the text with your mouse.
* **Action:** Click the "View Citation" button that appears below the response to show the exact section of the Factory Act.
* **Voiceover:** *"Here is the answer. It found a compliance gap! But more importantly, AETHON doesn't hallucinate. Look at the citations: it links the exact clause in the Factory Act to the conflicting line in our SOP. Zero guesswork."*

### Part 4: The Graph & Scoreboard (1:15 - 1:30)
* **Action:** Click the "View in Knowledge Graph" button next to the citation. It transitions to the graph visualization showing the node for "SOP-44" connected to "Factory Act".
* **Action:** Quickly click over to the "Dashboard/Scoreboard" tab showing the 95% accuracy gauge.
* **Voiceover:** *"Behind the scenes, this is powered by our local Knowledge Graph, which maps relationships between equipment, procedures, and the law. And as you can see on our accuracy scoreboard, we're achieving a 95% precision rate on our benchmarks. AETHON saves time, and saves lives. Thank you."*

---

## Dress Rehearsal Checklist (Day Before)
- [ ] Record the video above perfectly and save it as `Aethon_Demo.mp4`.
- [ ] Run through the exact same script *live* with the team on a screen-share.
- [ ] Verify there are no network timeouts when querying the LLM API.
- [ ] Ensure the camera and mic are working for whoever is presenting.
