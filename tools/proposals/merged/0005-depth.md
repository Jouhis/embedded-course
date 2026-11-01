# Proposals from the depth pass on lessons 0005 to 0009

Written by the depth-pass author for the lead to merge. Nothing in GLOSSARY.md or RESOURCES.md was edited.

## Glossary proposals (GLOSSARY.md format)

## Electronics

**Conductance (G)**:
The reciprocal of resistance, measured in siemens (S). Conductances add in parallel, so 1/R<sub>total</sub> = 1/R1 + 1/R2 is the sum of the two conductances.
_Avoid_: Conductivity (a material property, not a component property)

**Steady state**:
The condition in which a component's temperature has stopped rising because the heat leaving it equals the power going in.
_Avoid_: Equilibrium (too broad in this course)

**Band gap**:
The energy step a semiconductor's electron drops through when it recombines. A larger band gap gives a shorter wavelength of light, so it sets an LED's colour and its forward voltage.
_Avoid_: Bandgap (acceptable spelling in other sources)

**Drive strength**:
The output current a GPIO pad is set to supply, chosen from 2, 4, 8 or 12 mA on the RP2040. The default is 4 mA. It is a nominal setting, not a hard limit.
_Avoid_: Output current (the pin may supply less or more depending on the load)

**Loop**:
Any closed path through a circuit that starts and ends at the same node. Kirchhoff's voltage law says the voltage rises and drops around every loop sum to zero.
_Avoid_: Mesh (acceptable only in network-analysis texts)

## Resource proposals (RESOURCES.md format)

Add under "Free courses and tutorials" or "Vendor primary sources", as it fits:

- [SparkFun: basic red 5 mm LED, product 9590](https://sparkfun.com/products/9590)
  Typical forward voltage 2.0 V, range 1.8 to 2.2 V, as shown on the product page. Use for: lesson 9 (the forward-voltage example). Check your own LED's datasheet before you use any value.

- IEC 60063 (preferred-number series for resistors) is named in lesson 9 but has no link yet. A link needs fetching before it is added here.
