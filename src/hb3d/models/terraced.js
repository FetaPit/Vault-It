// Victorian mid-terrace (c. 1890): two storeys, one-brick solid walls in Flemish bond with a buff string course,
// stone dressings, canted ground-floor bay, panelled door with fanlight, timber sash windows, slate cut roof
// (ridge parallel to the street), shared chimney stacks on both party walls, two-storey rear outrigger,
// dwarf front wall with stone coping and gate, black-and-white tiled path, bins. Neighbours shown as ghosts.
(function (H) {
  var UK = H.UK;
  H.models.terraced = function (K, opts) {
    K.brickPalette = 'red';
    var W = 4.95, D1 = 8.54, Wo = 3.14, Do = 4.49;                      // frontage, main depth, outrigger (brick-modular, NHBC/realism review)
    var y0 = -0.15, ffl = 0.30, gf = 41 * UK.CH;                            // raised ground floor (2 steps), 3.075 floor-to-floor
    var floor1 = ffl + gf, eave = y0 + 83 * UK.CH;                        // first floor 3.375, wall plate 6.075
    var pitch = 40, rise = D1 / 2 * Math.tan(pitch * Math.PI / 180), ridge = eave + rise;
    var oEave = y0 + 79 * UK.CH, oPitch = 35, oRise = Wo / 2 * Math.tan(oPitch * Math.PI / 180), oRidge = oEave + oRise;
    var pts = [[0, 0], [W, 0], [W, -D1], [W, -D1 - Do], [W - Wo, -D1 - Do], [W - Wo, -D1], [0, -D1]];
    // runs: 0 front · 1 right party (main) · 2 right party (outrigger) · 3 outrigger back · 4 outrigger side · 5 main back · 6 left party
    K.foundation(pts);
    var sash = 'sash22', stone = 'stone';
    var openings = {
      0: [{ u0: 0.45, u1: 2.85, v0: 0.15, v1: 2.775, type: 'void' },                                         // bay opening
          { u0: 3.39, u1: 4.425, v0: ffl, v1: 3.00, type: 'door', fanlight: true, color: 'doorGreen', number: true, lintel: stone },
          { u0: 1.08, u1: 2.215, v0: floor1 + 0.75, v1: floor1 + 2.25, type: 'window', style: sash, lintel: stone, sill: stone },
          { u0: 3.465, u1: 4.375, v0: floor1 + 0.75, v1: floor1 + 2.25, type: 'window', style: sash, lintel: stone, sill: stone }],
      3: [{ u0: 0.90, u1: 2.025, v0: 0.90, v1: 2.25, type: 'window', style: sash, lintel: 'soldier', sill: stone },
          { u0: 1.125, u1: 2.025, v0: floor1 + 0.75, v1: floor1 + 2.10, type: 'window', style: sash, lintel: 'soldier', sill: stone }],
      4: [{ u0: 0.675, u1: 1.575, v0: 0.15, v1: 2.25, type: 'door', color: 'doorBlack', lintel: 'soldier' },
          { u0: 2.25, u1: 3.375, v0: 0.90, v1: 2.25, type: 'window', style: sash, lintel: 'soldier', sill: stone },
          { u0: 2.475, u1: 3.15, v0: floor1 + 0.90, v1: floor1 + 2.10, type: 'window', style: 'sash', lintel: 'soldier', sill: stone }],
      5: [{ u0: 0.45, u1: 1.575, v0: 0.90, v1: 2.25, type: 'window', style: sash, lintel: 'soldier', sill: stone },
          { u0: 0.45, u1: 1.35, v0: floor1 + 0.75, v1: floor1 + 2.10, type: 'window', style: sash, lintel: 'soldier', sill: stone }]
    };
    var hooks = [
      { y: floor1 - 0.20, fn: function (k) { k.floor(0.215, -D1 + 0.215, W - 0.215, -0.215, floor1); k.floor(W - Wo + 0.215, -D1 - Do + 0.215, W - 0.215, -D1, floor1 - 0.15); } },
      { y: 1.40, fn: function (k) { k.scaffoldLift([[0, 0], [W, 0], [W, -D1 - Do], [0, -D1 - Do]], 2.0); } },
      { y: 3.40, fn: function (k) { k.scaffoldLift([[0, 0], [W, 0], [W, -D1 - Do], [0, -D1 - Do]], 4.0); } },
      { y: 5.00, fn: function (k) { k.scaffoldLift([[0, 0], [W, 0], [W, -D1 - Do], [0, -D1 - Do]], 5.80); } }
    ];
    K.wallLoop(pts, {
      y0: y0, y1: eave, bond: 'flemish', palette: 'red', party: [1, 2, 6], partyBond: 'flemish', partyPalette: 'brown', lintels: stone, sills: stone, frame: 'timberPaint', mortar: 'mortarLime', setback: 0.11,
      runY1: { 2: oEave, 3: oEave, 4: oEave },
      gables: { 1: { ridgeU: D1 / 2, ridgeY: ridge, half: D1 / 2, eaveY: eave }, 6: { ridgeU: D1 / 2, ridgeY: ridge, half: D1 / 2, eaveY: eave }, 3: { ridgeU: Wo / 2, ridgeY: oRidge, half: Wo / 2, eaveY: oEave } },
      openings: openings, hooks: hooks,
      bands: [{ y0: floor1 - 0.075, y1: floor1 + 0.075, palette: 'london' }, { y0: eave - 0.30, y1: eave - 0.225, palette: 'london' }]
    });
    // wall between the main house and the outrigger, above the outrigger roof up to the main eaves
    K.stage('masonry');
    K.wallRun(W, -D1, W - Wo, -D1, [0, -1], oEave - 0.15, eave, { bond: 'flemish', palette: 'red' });
    // canted bay with stone mullions, sashes and a slate roof
    K.bayWindow({ x0: 0.45, x1: 2.85, d: 0.675, zf: 0, sill: ffl + 0.75, head: ffl + 2.25, top: ffl + 2.475, style: 'sash22', palette: 'red', frame: 'timberPaint' });
    // shared chimney stacks straddling both party walls at the ridge, four pots each
    [0, W].forEach(function (x) { K.chimney({ x: x, z: -D1 / 2 - 0.45, y0: ridge - 1.1, y1: ridge + 0.975, w: 0.665, d: 1.565, pots: 4, roofY: ridge - 0.5 }); });
    K.chimney({ x: W, z: -D1 - Do + 1.2, y0: oRidge - 0.9, y1: oRidge + 0.90, w: 0.44, d: 0.89, pots: 2 });
    // roofs: main (cut roof, slate, gables to the party walls), outrigger (ridge front-to-back, gable at the back)
    K.roofGable({ x0: 0, x1: W, z0: -D1, z1: 0, eaveY: eave, pitch: pitch, ridge: 'x', tile: 'slate', overhang: 0.25, verge: 0.0, cut: true, barge: false, ridgeMat: 'ridge' });
    K.roofGable({ x0: W - Wo, x1: W, z0: -D1 - Do, z1: -D1 + 0.30, eaveY: oEave, pitch: oPitch, ridge: 'z', tile: 'slate', overhang: 0.20, verge: 0.0, cut: true, barge: false, downpipes: 1 });
    // front garden: dwarf wall with stone coping + gate, tiled path, gravel bed, shrubs, bins
    var gz = 3.375;
    K.gardenWall([[0.12, gz], [W - 0.12, gz]], 0.825, { gates: [{ seg: 0, u0: 3.25, u1: 4.30 }], palette: 'red', coping: 'stone' });
    K.gardenWall([[0.11, 0.05], [0.11, gz]], 0.825, { palette: 'red' });
    K.tiledPath(3.30, 0.15, 4.35, gz - 0.10);
    K.stage('external'); K.box('gravel', 1.65, 0.02, 1.95, 2.9, 0.03, 2.3, {}); K.stage('masonry');
    K.shrub(0.75, 2.4, 0.42); K.shrub(1.5, 2.65, 0.32);
    K.bin(2.45, 2.55, 0, 'binBlack'); K.bin(2.95, 2.55, 0, 'binGreen');
    // rear yard: paving + 1.8 m brick boundary wall
    K.paving(0.25, -D1 - Do - 4.0, W - Wo - 0.1, -D1 - 0.3);
    // neighbours either side (ghost blueprints)
    [-2, -1, 1, 2].forEach(function (n) { K.ghostHouse(n * W, (n + 1) * W, -D1, 0, eave, ridge, 'x'); });
    K.anchor('front', W / 2, 1.5, 0); K.anchor('top', W / 2, ridge, -D1 / 2);
    return { name: 'Victorian mid-terrace', info: { storeys: 2, frontage: W, depth: D1 + Do, eave: eave, ridge: ridge } };
  };
})(HB3D);
