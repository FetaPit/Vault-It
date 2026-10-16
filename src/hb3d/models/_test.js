(function (H) {
  H.models._test = function (K) {
    var W = 5.4, D = 4.5, UK = H.UK;
    var pts = [[0, 0], [W, 0], [W, -D], [0, -D]];
    K.foundation(pts);
    var eave = 0.15 + 35 * UK.CH * 2 - 0.15 + 0.15;
    var top0 = -0.15 + 72 * UK.CH, rise = D / 2 * Math.tan(38 * Math.PI / 180);
    K.wallLoop(pts, { y1: top0, gables: { 1: { ridgeU: D / 2, ridgeY: top0 + rise, half: D / 2 }, 3: { ridgeU: D / 2, ridgeY: top0 + rise, half: D / 2 } }, openings: { 0: [{ u0: 0.6, u1: 1.725, v0: 0.9, v1: 2.1, type: 'window', style: 'casement' }, { u0: 2.4, u1: 3.3, v0: 0.15, v1: 2.1, type: 'door', fanlight: false, color: 'doorBlue' }] },
      hooks: [{ y: 2.775, fn: function (k) { k.floor(0.3, -D + 0.3, W - 0.3, -0.3, 2.85); } }] });
    var top = -0.15 + 72 * UK.CH;
    K.roofGable({ x0: 0, x1: W, z0: -D, z1: 0, eaveY: top, pitch: 38, ridge: 'x', tile: 'concrete' });
    K.lawn(0, 0.3, W, 4); K.paving(2.4, 0.3, 3.3, 4);
    return { name: 'Test box' };
  };
})(HB3D);
