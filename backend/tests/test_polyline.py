from polyline import decode


def test_decode_known_polyline():
    # Short encoded path (Google polyline algorithm sanity check)
    coords = decode("_p~iF~ps|U_ulLnnqC_mqNvxq`@")
    assert len(coords) >= 2
    assert abs(coords[0][0] - 38.5) < 0.1
    assert abs(coords[0][1] - (-120.2)) < 0.1
