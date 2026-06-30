import fitz

doc = fitz.open()
page = doc.new_page()
text = """Pump P-204 Maintenance Manual

1. General Overview
The Pump P-204 is a high-pressure centrifugal pump used for cooling loops.

2. Maintenance Procedures
When performing maintenance on the main valve, the required torque is exactly 55 Nm. Do not over-torque.

3. Safety Regulations
Confined space entry around the pump area requires continuous atmospheric monitoring as per Factory Act Section 36(1)(b).
"""
page.insert_text((50, 50), text)
doc.save("sample_manual.pdf")
doc.close()
print("Created sample_manual.pdf")
