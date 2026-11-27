# Holdfast Cradle: a parametric OpenSCAD wall mount

- **Category:** 3D modeling
- **Label:** Concept demo
- **Year:** 2026

## What it is

A parametric wall-mount cradle for routers, power strips, USB hubs and remotes, modelled in OpenSCAD for a made-up small hardware shop. You type in a device's size in the Customizer and the whole part rebuilds: pocket, walls, screw holes, cable cutouts, vents and an optional label, ready to print with no supports. The page shows the exported STL files in a 3D viewer you can turn and zoom.

## Who it's for

Makers, small product shops and Etsy or Printables sellers who need a configurable 3D-printable part, and anyone with an OpenSCAD, CAD-to-STL or "make this model parametric" job.

## Key features

- One commented .scad file with 35 Customizer settings in 8 groups, each with a unit and a range
- Four presets saved as Customizer parameter sets, each exported to STL: power strip tray, upright router cradle, USB hub pocket and remote caddy
- Printability built in: one clearance setting for fit, teardrop keyholes and countersunk holes that print standing up, a 45° fillet at the back joint, and a first-layer chamfer
- Guard rails that stop the render with a plain message when settings would make a broken part
- An export script that renders previews from the exported meshes and checks each STL is watertight, flat on the bed and the right size (21 checks pass)
- An in-browser STL viewer (three.js) with the device as a see-through box, a wall view and an x-ray view, plus a parameter table generated from the .scad and a bed-size check
