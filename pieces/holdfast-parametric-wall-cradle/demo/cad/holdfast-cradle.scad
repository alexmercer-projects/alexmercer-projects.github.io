// =====================================================================
//  Holdfast Cradle: a parametric wall-mount cradle for box-shaped gear
//  (routers, power strips, USB hubs, remotes, label printers...)
//
//  Concept demo by Alex Mercer for Brindle & Bolt Workshop, a made-up
//  small hardware shop. Not a real product, not client work.
//
//  Open in OpenSCAD 2021.01 or newer, then Window > Customizer.
//  Every number below is in millimetres.
//
//  How the model is built (so you can change it with confidence):
//    1. A side profile (the "S" shape you see from the left) is
//       extruded across the full width: tall back plate, floor, sloped
//       side walls, short front lip.
//    2. That is intersected with a rounded footprint, which rounds the
//       vertical corners, and with a chamfered slab, which takes the
//       sharp edge off the first layer (elephant's foot).
//    3. The device pocket, cable notch, floor vents, cord slot, screw
//       holes and the optional label are then cut out of that solid.
//
//  Print orientation: exactly as modelled, floor down on the bed.
//  Nothing in this model needs supports; see the printability notes
//  next to each feature and in README.md.
//  License: MIT (see LICENSE in the repository).
// =====================================================================

/* [Device to hold] */
// Device width, left to right (mm)
device_width = 120; // [20:1:400]
// Device depth, measured out from the wall (mm)
device_depth = 40; // [10:1:200]
// Device height. Only used for the see-through preview box (mm)
device_height = 110; // [5:1:300]

/* [Fit and tolerance] */
// Gap added on every side of the device. 0.6 suits most FDM printers; use 0.3 for a snug fit, 1.0 for rubber-footed or textured devices (mm)
clearance = 0.6; // [0:0.1:2]

/* [Cradle shape] */
// Side and front wall thickness. Keep it a multiple of your line width (0.4 nozzle: 1.6, 2.0, 2.4, 3.2) so the slicer fills it with whole perimeters (mm)
wall = 2.4; // [1.2:0.4:6]
// Back plate thickness. Keyholes need at least 4.5 so the screw head can slide inside the plate (mm)
back_thickness = 5; // [3:0.5:10]
// Floor thickness (mm)
floor_thickness = 3; // [1.6:0.2:8]
// Total height of the back plate, from the bed up (mm)
back_height = 60; // [15:1:250]
// Side wall height at the back, above the floor (mm)
side_height = 32; // [4:1:200]
// Front lip height above the floor. The side walls slope down to meet it (mm)
front_lip_height = 12; // [0:1:150]
// Radius of the vertical outside corners (mm)
corner_radius = 4; // [0:0.5:12]
// Radius of the top edges seen from the side (mm)
edge_radius = 1.5; // [0:0.25:4]
// 45 degree fillet where the floor meets the walls inside the pocket. Stiffens the back joint and prints with no overhang (mm)
inner_fillet = 2; // [0:0.5:6]

/* [Mounting] */
// keyhole: hangs on screws already in the wall. countersunk: screwed through from inside. none: for adhesive strips
mount_style = "keyhole"; // [keyhole, countersunk, none]
// Number of screw holes, spread evenly across the back plate
screw_count = 2; // [1:1:4]
// Screw shank diameter. 4.0 suits #8 / M4 wood and anchor screws (mm)
screw_shank = 4.0; // [2.5:0.1:6]
// Screw head diameter (mm)
screw_head = 8.5; // [5:0.1:12]
// How far the keyhole slot runs up from the head hole (mm)
keyhole_travel = 8; // [4:0.5:20]
// Height of the screw holes' centre above the bed. 0 = automatic: midway up the plate, above the side walls when there is room (mm)
hole_height = 0; // [0:1:240]
// Smallest distance from a screw hole centre to the plate's side edge (mm)
hole_edge_margin = 14; // [8:1:60]

/* [Cable routing] */
// Width of the U-notch cut into the front lip, centred. 0 = no notch (mm)
front_notch_width = 14; // [0:1:120]
// Cut the notch at the left/right end of the lip instead of the centre
front_notch_position = "center"; // [center, left, right]
// Slot through the floor along the back wall, for cords that drop down behind the device
cord_slot = true;
// Cord slot width, front to back (mm)
cord_slot_width = 10; // [5:1:30]
// Cord slot length, as a share of the inside width
cord_slot_share = 0.5; // [0.2:0.05:0.9]

/* [Ventilation] */
// Rows of vent slots through the floor (routers and power bricks run warm)
floor_vents = true;
// Vent slot width (mm)
vent_width = 4; // [2:0.5:10]
// Solid strip between vent slots (mm)
vent_rib = 3.2; // [1.6:0.4:8]
// Keep vents this far from the inside walls (mm)
vent_margin = 6; // [3:1:20]

/* [Label] */
// Text pressed into the front of the lip. Leave empty for none
label_text = "";
// Label letter height (mm)
label_size = 5; // [3:0.5:12]
// How deep the label is pressed in. 0.6 = three 0.2 mm layers (mm)
label_depth = 0.6; // [0.2:0.2:1.6]

/* [Print and preview] */
// Chamfer on the first-layer edge, to hide elephant's foot (mm)
bed_chamfer = 0.4; // [0:0.1:1.2]
// Show the device as a see-through box in preview (never exported)
show_device = true;
// Curve smoothness: smallest facet size (mm)
facet_size = 0.4; // [0.2:0.1:2]

/* [Hidden] */
// Exact axis swaps (no rounding): 2D drawing -> standing planes.
YZ_TO_X = [[0, 0, 1, 0], [1, 0, 0, 0], [0, 1, 0, 0]];  // 2D x -> y, 2D y -> z, extrude -> +x
XZ_TO_Y = [[1, 0, 0, 0], [0, 0, 1, 0], [0, 1, 0, 0]];  // 2D x -> x, 2D y -> z, extrude -> +y
$fs = facet_size;
$fa = 4;
eps = 0.01;      // tiny overlap so cuts never leave zero-thickness skins
big = 1000;      // "far enough" for cutting tools

// ---------------------------------------------------------------------
//  Derived sizes. Everything else is measured from these.
// ---------------------------------------------------------------------
inner_w = device_width + 2 * clearance;          // pocket width
inner_d = device_depth + 2 * clearance;          // pocket depth
outer_w = inner_w + 2 * wall;                    // total width (x)
outer_d = back_thickness + inner_d + wall;       // total depth (y), wall side at y = 0
pocket_y0 = back_thickness;                      // pocket starts behind the back plate
front_y0 = back_thickness + inner_d;             // inside face of the front lip
side_top = floor_thickness + side_height;        // side wall top at the back
lip_top = floor_thickness + front_lip_height;    // front lip top

// Screw hole height. Automatic: middle of the plate above the side walls
// when there is at least 2.5 heads of room there, otherwise middle of the
// plate above the floor (holes then sit inside the pocket, behind the device).
auto_hole_z = (back_height - side_top >= 2.5 * screw_head + keyhole_travel)
    ? (side_top + back_height) / 2
    : (floor_thickness + back_height) / 2;
hole_z = hole_height > 0 ? hole_height : auto_hole_z;

// ---------------------------------------------------------------------
//  Sanity checks. A bad combination stops the render with a plain message
//  instead of exporting a broken part.
// ---------------------------------------------------------------------
assert(back_height >= side_top + 2,
       "back_height must be at least 2 mm taller than floor + side_height");
assert(front_lip_height <= side_height,
       "front_lip_height can't be taller than side_height");
assert(front_notch_width <= inner_w - 2 * corner_radius,
       "front_notch_width is wider than the front lip");
assert(mount_style != "keyhole" || back_thickness >= 4.5,
       "keyholes need back_thickness of at least 4.5 mm");
assert(screw_head > screw_shank + 1,
       "screw_head must be at least 1 mm wider than screw_shank");
assert(mount_style == "none" ||
       hole_z + keyhole_travel / 2 + screw_head / 2 + 3 <= back_height,
       "screw holes don't fit: raise back_height or lower hole_height");
assert(mount_style == "none" ||
       hole_z - keyhole_travel / 2 - screw_head / 2 - 2 >= floor_thickness,
       "screw holes run into the floor: raise hole_height or back_height");
assert(screw_count == 1 || outer_w - 2 * hole_edge_margin >= (screw_count - 1) * (screw_head + 4),
       "too many screws for this width: lower screw_count or hole_edge_margin");

echo(str("HOLDFAST outer size (w x d x h): ",
         outer_w, " x ", outer_d, " x ", back_height, " mm"));
echo(str("HOLDFAST pocket (w x d): ", inner_w, " x ", inner_d,
         " mm, screw holes at z = ", hole_z, " mm"));

// ---------------------------------------------------------------------
//  2D helpers
// ---------------------------------------------------------------------

// Rectangle with rounded corners, anchored at [0,0].
module rounded_rect(size, r) {
    r2 = min(r, min(size[0], size[1]) / 2 - eps);
    if (r2 <= 0) square(size);
    else translate([r2, r2]) offset(r = r2) square([size[0] - 2 * r2, size[1] - 2 * r2]);
}

// Stadium (slot with round ends) from p1 to p2.
module stadium(p1, p2, d) {
    hull() { translate(p1) circle(d = d); translate(p2) circle(d = d); }
}

// Teardrop: a circle with a 45 degree point on top. A plain round hole
// in a vertical wall leaves a flat, drooping ceiling when printed; the
// pointed top keeps every surface at 45 degrees or steeper, so it
// prints clean with no supports. Drawn in the XY plane, point at +Y.
module teardrop(d) {
    r = d / 2;
    union() {
        circle(r = r);
        // square rotated 45 degrees, tip at r * sqrt(2) above centre
        rotate(45) square([r, r]);
    }
}

// Points along a quarter circle, for rounding a corner by hand.
function arc(c, r, a0, a1) =
    let (n = max(2, ceil(abs(a1 - a0) / 90 * max(4, ceil(PI * r / 2 / facet_size)))))
    [for (i = [0 : n]) let (a = a0 + (a1 - a0) * i / n) c + r * [cos(a), sin(a)]];

// The side profile, in the YZ plane (drawn as 2D x = depth, y = height).
// The points are worked out directly rather than rounded with offset():
// offset() snaps coordinates to a fine grid, and a face that ends up a
// millionth of a millimetre off the pocket wall leaves a paper-thin sliver
// that slicers report as a broken mesh.
module side_profile() {
    r = min(edge_radius, back_thickness / 2 - eps, front_lip_height / 2, wall / 2);
    slope_end = front_y0 - min(2, inner_d / 4);   // stop short of the pocket wall
    pts = r > 0 ? concat(
        [[0, 0], [outer_d, 0]],
        arc([outer_d - r, lip_top - r], r, 0, 90),              // front top edge of the lip
        [[slope_end, lip_top], [pocket_y0, side_top]],          // slope up to the back
        arc([pocket_y0 - r, back_height - r], r, 0, 90),        // back plate, front top edge
        arc([r, back_height - r], r, 90, 180)                   // back plate, wall-side top edge
    ) : [
        [0, 0], [outer_d, 0], [outer_d, lip_top], [slope_end, lip_top],
        [pocket_y0, side_top], [pocket_y0, back_height], [0, back_height]
    ];
    // The bed edges stay square: a rounded bottom edge would be an
    // overhang on the very first layers.
    polygon(pts);
}

// ---------------------------------------------------------------------
//  3D body
// ---------------------------------------------------------------------

// The solid before anything is cut out of it.
module body_blank() {
    intersection() {
        // side profile extruded across the width. An exact axis swap
        // instead of rotate([90, 0, 90]): rotate() goes through sin/cos and
        // leaves faces a hair off 5 mm, which turns into slivers later.
        multmatrix(YZ_TO_X) linear_extrude(outer_w) side_profile();
        // rounded footprint, with the first-layer chamfer
        hull() {
            linear_extrude(eps)
                offset(delta = -bed_chamfer) rounded_rect([outer_w, outer_d], corner_radius);
            translate([0, 0, bed_chamfer])
                linear_extrude(big) rounded_rect([outer_w, outer_d], corner_radius);
        }
    }
}

// Device pocket, with a fillet along the floor. The fillet is made by
// cutting a pocket that is narrower at the floor and full width from
// inner_fillet up: a 45 degree fillet, which prints without supports
// on the inside of the walls, where a round one would start with a
// flat overhang.
module pocket() {
    pr = max(min(corner_radius - wall, 3), 0.5);
    f = inner_fillet;
    translate([wall, pocket_y0, floor_thickness]) hull() {
        translate([f, f, 0]) linear_extrude(eps)
            pocket_outline([inner_w - 2 * f, inner_d - 2 * f], pr);
        translate([0, 0, f]) linear_extrude(big)
            pocket_outline([inner_w, inner_d], pr);
    }
}

// Pocket seen from above: rounded at the front, square at the back, so
// its back face lines up exactly with the face of the back plate.
module pocket_outline(size, r) {
    union() {
        rounded_rect(size, r);
        square([size[0], size[1] / 2]);
    }
}

// Where the front notch is centred, across the width.
function notch_x() =
    front_notch_position == "left"  ? wall + corner_radius + front_notch_width / 2 + 4 :
    front_notch_position == "right" ? outer_w - wall - corner_radius - front_notch_width / 2 - 4 :
    outer_w / 2;

// U-shaped cable notch in the front lip, down to the floor surface. The
// round part is at the bottom (a cradle for the cable), so it prints
// without any overhang.
module front_notch() {
    if (front_notch_width > 0) {
        w = front_notch_width;
        translate([notch_x(), front_y0 - 1, 0]) multmatrix(XZ_TO_Y)
            linear_extrude(wall + 2)
                // drawn flat (x across, y up), then stood up facing the front
                hull() {
                    translate([0, floor_thickness + w / 2]) circle(d = w);
                    translate([-w / 2, big]) square([w, eps]);
                }
    }
}

// Vent slots through the floor, running front to back.
module floor_vent_cuts() {
    if (floor_vents) {
        x0 = wall + inner_fillet + vent_margin;
        x1 = wall + inner_w - inner_fillet - vent_margin;
        y0 = pocket_y0 + inner_fillet + vent_margin + (cord_slot ? cord_slot_width + 3 : 0);
        y1 = front_y0 - inner_fillet - vent_margin;
        pitch = vent_width + vent_rib;
        n = floor((x1 - x0 + vent_rib) / pitch);
        // centre the group of slots in the floor
        start = x0 + ((x1 - x0) - (n * pitch - vent_rib)) / 2 + vent_width / 2;
        if (n > 0 && y1 - y0 > vent_width * 2)
            for (i = [0 : n - 1])
                translate([start + i * pitch, 0, -eps])
                    linear_extrude(floor_thickness + 2 * eps)
                        stadium([0, y0 + vent_width / 2], [0, y1 - vent_width / 2], vent_width);
    }
}

// Cord slot through the floor, right against the back plate.
module cord_slot_cut() {
    if (cord_slot) {
        len = max(inner_w * cord_slot_share, cord_slot_width * 2);
        cy = pocket_y0 + inner_fillet + cord_slot_width / 2 + 0.8;
        translate([0, 0, -eps]) linear_extrude(floor_thickness + inner_fillet + 2 * eps)
            stadium([outer_w / 2 - len / 2 + cord_slot_width / 2, cy],
                    [outer_w / 2 + len / 2 - cord_slot_width / 2, cy],
                    cord_slot_width);
    }
}

// X positions of the screw holes, spread evenly.
function hole_xs() =
    screw_count == 1 ? [outer_w / 2] :
    [for (i = [0 : screw_count - 1])
        hole_edge_margin + i * (outer_w - 2 * hole_edge_margin) / (screw_count - 1)];

// Cut a 2D shape (drawn in XZ, z up) straight through the back plate,
// from the wall side (y = 0) to depth `depth`.
module through_back(depth) {
    translate([0, -1, 0]) multmatrix(XZ_TO_Y)
        linear_extrude(depth + 1 + (depth >= back_thickness ? 1 : 0)) children();
}

// Keyhole: the screw head goes in the big hole at the bottom, the plate
// drops, and the shank rides up the slot. Behind the slot, a channel
// one head wide is cut into the wall side of the plate so the head sits
// inside it. All tops are teardrop points: no supports needed.
module keyhole(x) {
    lower = hole_z - keyhole_travel / 2;   // centre of the head hole
    upper = hole_z + keyhole_travel / 2;   // where the screw ends up
    channel = back_thickness - 1.8;        // 1.8 mm of plate stays in front of the head
    // shank slot, all the way through
    through_back(back_thickness) hull() {
        translate([x, lower]) teardrop(screw_shank + 0.4);
        translate([x, upper]) teardrop(screw_shank + 0.4);
    }
    // head hole, all the way through
    through_back(back_thickness) translate([x, lower]) teardrop(screw_head + 0.6);
    // head channel, from the wall side only
    through_back(channel) hull() {
        translate([x, lower]) teardrop(screw_head + 0.6);
        translate([x, upper]) teardrop(screw_head + 0.6);
    }
}

// Countersunk hole: screwed through from the pocket side into the wall.
// The 90 degree cone has 45 degree walls, which print fine standing up.
module countersunk(x) {
    through_back(back_thickness) translate([x, hole_z]) teardrop(screw_shank + 0.4);
    // cone opens toward the pocket (y = back_thickness)
    cs = (screw_head + 0.4) / 2;
    translate([x, back_thickness + 0.2, hole_z]) multmatrix(XZ_TO_Y) mirror([0, 0, 1])
        cylinder(r1 = cs + 0.2, r2 = 0, h = cs + 0.2);
}

module mounting_holes() {
    for (x = hole_xs()) {
        if (mount_style == "keyhole") keyhole(x);
        else if (mount_style == "countersunk") countersunk(x);
    }
}

// Label pressed into the front face of the lip. The text is drawn flat,
// stood up to face the front (+Y) and turned so it reads left to right
// when you look at the cradle on the wall. Pressed-in (not raised) text
// on a vertical face prints cleanly at 0.2 mm layers.
module label_cut() {
    if (label_text != "" && front_lip_height >= label_size + 3) {
        translate([outer_w / 2, outer_d - label_depth, (floor_thickness + lip_top) / 2 - 0.5])
            mirror([1, 0, 0]) multmatrix(XZ_TO_Y)
                linear_extrude(label_depth + 1)
                    text(label_text, size = label_size, halign = "center", valign = "center",
                         font = "Liberation Sans:style=Bold", spacing = 1.08);
    }
}

module holdfast_cradle() {
    difference() {
        body_blank();
        pocket();
        front_notch();
        floor_vent_cuts();
        cord_slot_cut();
        mounting_holes();
        label_cut();
    }
}

// ---------------------------------------------------------------------
//  Output
// ---------------------------------------------------------------------
color("#d9773a") holdfast_cradle();

// See-through device, preview only (the % modifier is never exported).
if (show_device)
    %translate([wall + clearance, pocket_y0 + clearance, floor_thickness + 0.01])
        cube([device_width, device_depth, device_height]);
