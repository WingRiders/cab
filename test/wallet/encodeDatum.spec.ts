import assert from 'assert'
import {encode} from 'borc'

import {parseFromSchemaJson, toSchemaJson} from '@/ledger/plutus'
import {CBOR_SORT_ORDER, CborIndefiniteLengthArray, CborizedTxDatum} from '@/ledger/transaction'
import {hashSerialized} from '@/ledger/transaction/utils'
import {TxDatum} from '@/types'

describe('Datums', () => {
  describe('CborizedTxDatum encoding', () => {
    function compareScriptDataEncode(obj, mappedType) {
      assert.deepEqual(encode(new CborizedTxDatum(obj)), encode(mappedType))
    }

    const unchanged = [Buffer.from('a'), 134]
    for (const entry of unchanged) {
      it(`should be same for ${entry} `, () => {
        assert.deepEqual(encode(new CborizedTxDatum(entry)), encode(entry))
      })
    }

    it('String should be bytestrings', () => {
      compareScriptDataEncode('hello', Buffer.from('hello'))
    })

    it('Arrays should be infinite arrays', () => {
      compareScriptDataEncode([1, 2, 3], new CborIndefiniteLengthArray([1, 2, 3]))
    })

    it('Strings inside arrays should be bytestrings', () => {
      compareScriptDataEncode(
        ['a', 'b', 2],
        new CborIndefiniteLengthArray([Buffer.from('a'), Buffer.from('b'), 2])
      )
    })

    for (const sortOrderKey of Object.keys(CBOR_SORT_ORDER)) {
      const sortOrder = CBOR_SORT_ORDER[sortOrderKey]
      it(`Objects keys and values should be bytestrings ${sortOrder}`, () => {
        assert.deepEqual(
          encode(new CborizedTxDatum({a: 1, b: 'c'} as unknown as TxDatum, sortOrder)),
          encode(
            new Map<Buffer, Buffer | number>([
              [Buffer.from('a'), 1],
              [Buffer.from('b'), Buffer.from('c')],
            ])
          )
        )
      })
    }

    it('Deeper recursive obj', () => {
      assert.deepEqual(
        encode(new CborizedTxDatum({a: {b: 'c'}} as unknown as TxDatum)),
        encode(new Map([[Buffer.from('a'), new Map([[Buffer.from('b'), Buffer.from('c')]])]]))
      )
    })

    it('BORC order should differ from alphabetical', () => {
      assert.notDeepEqual(
        encode(
          new CborizedTxDatum({abc: 1, b: 2} as unknown as TxDatum, CBOR_SORT_ORDER.BORC_CANONICAL)
        ),
        encode(new CborizedTxDatum({abc: 1, b: 2} as unknown as TxDatum, CBOR_SORT_ORDER.ALPHABETICAL))
      )
    })

    const withConstr = {
      int: [{i: 0, data: [1], __typeConstr: true}, 'd8799f01ff'],
      string: [{i: 1, data: ['string'], __typeConstr: true}, 'd87a9f46737472696e67ff'],
      multiple: [{i: 2, data: ['string', 1], __typeConstr: true}, 'd87b9f46737472696e6701ff'],
      deep: [
        {
          i: 3,
          data: [
            {i: 0, data: [4], __typeConstr: true},
            {i: 0, data: [6], __typeConstr: true},
          ],
          __typeConstr: true,
        },
        'd87c9fd8799f04ffd8799f06ffff',
      ],
      over7: [{i: 24, data: ['over7'], __typeConstr: true}, 'd905119f456f76657237ff'],
    }

    for (const entry of Object.entries(withConstr)) {
      it(`With constructor ${entry[0]}`, () => {
        const [obj, hex] = entry[1]
        assert.deepEqual(encode(new CborizedTxDatum(obj)).toString('hex'), hex)
      })
    }

    it('pool', () => {
      /**
       * Pool (LiquidityPool ada $ executorToken dex) 123
       * 124([
       *   121([
       *     121([h'', h'']),
       *     121([h'B362B913D02D703B1E3381B62F9C0CEE5E89F6627047971E1B97C6AF', h''])
       *   ]),
       *   123
       * ])
       */
      const ada = {i: 0, data: ['', ''], __typeConstr: true}
      const executorToken = {
        i: 0, // assetclass executor token
        data: [Buffer.from('B362B913D02D703B1E3381B62F9C0CEE5E89F6627047971E1B97C6AF', 'hex'), ''],
        __typeConstr: true,
      }
      const liquidityPool = {
        i: 0, // LiquidityPool
        data: [ada, executorToken],
        __typeConstr: true,
      }
      const poolDatum = {
        i: 3, // Pool data constructor
        data: [
          liquidityPool,
          123, // shares given out
        ],
        __typeConstr: true,
      }
      const hex =
        'd87c9fd8799fd8799f4040ffd8799f581cb362b913d02d703b1e3381b62f9c0cee5e89f6627047971e1b97c6af40ffff187bff'
      assert.deepEqual(encode(new CborizedTxDatum(poolDatum)).toString('hex'), hex)
    })

    it('With indefinite length array', () => {
      // datum with indefinite length arrays
      const datumCbor =
        'd8799fd8799fd8799fd8799f581cfd4e846bedb80f3f099c1b9dcccaf38ecccea6fc3f5ea8a9842ce698ffd8799fd8799fd8799f581c14a8b6e32b526ffe9cccc4ba45a36fd6731f3097d5a5408e8f7ed801ffffffff581cfd4e846bedb80f3f099c1b9dcccaf38ecccea6fc3f5ea8a9842ce6981b000001932294a49ad8799fd8799f4040ffd8799f581cb6a7467ea1deb012808ef4e87b5ff371e85f7142d7b356a40d9b42a0581e436f726e75636f70696173205b76696120436861696e506f72742e696f5dffffffd8799fd879801b0000000456374826ffff'
      const decodedDatum = CborizedTxDatum.decode(datumCbor)
      assert.equal(encode(new CborizedTxDatum(decodedDatum)).toString('hex'), datumCbor)
    })

    it('With definite length array', () => {
      // datum with definite length arrays
      const datumCbor =
        'd87982d87984d87982d87981581cfd4e846bedb80f3f099c1b9dcccaf38ecccea6fc3f5ea8a9842ce698d87981d87981d87981581c14a8b6e32b526ffe9cccc4ba45a36fd6731f3097d5a5408e8f7ed801581cfd4e846bedb80f3f099c1b9dcccaf38ecccea6fc3f5ea8a9842ce6981b000001932294a49ad87982d879824040d87982581cb6a7467ea1deb012808ef4e87b5ff371e85f7142d7b356a40d9b42a0581e436f726e75636f70696173205b76696120436861696e506f72742e696f5dd87982d879801b0000000456374826'
      const decodedDatum = CborizedTxDatum.decode(datumCbor)
      assert.equal(encode(new CborizedTxDatum(decodedDatum)).toString('hex'), datumCbor)
    })
  })

  describe('json', () => {
    const testEntries = [
      ['int', '{"int": 4}', '04'],
      ['int', '{"int": 24}', '1818'],
      ['empty constr', '{"fields": [], "constructor": 0}', 'd87980'],
      ['constr', '{"fields": [{"int": -5}], "constructor": 3}', 'd87c9f24ff'],
      ['empty list', '{"list": []}', '80'],
      ['list', '{"list": [{"int": 5}, {"int": 10}]}', '9f050aff'],
      ['empty map', '{"map": []}', 'a0'],
      ['map', '{"map": [{"k": {"bytes": "61"}, "v": {"int": 2}}]}', 'a1416102'],
      [
        'map',
        '{"map": [{"k": {"bytes": "61"}, "v": {"int": 2}}, {"k": {"bytes": "62"}, "v": {"list": [{"bytes": "6869"}, {"bytes": "6368616e636573"}]}}]}',
        'a241610241629f426869476368616e636573ff',
      ],
      ['bytes', '{"bytes": "546f7262656e"}', '46546f7262656e'],
      [
        'complex1',
        '{"fields": [{"bytes": "7cccee4755c49a66f9d3e8957845fa92955bb8567dc0a6b2e5349848"}, {"bytes": "b24cbc88cdd3eea40416155d9cf2f268fc52ceabe1b0eabc961bf1ad"}], "constructor": 0}',
        'd8799f581c7cccee4755c49a66f9d3e8957845fa92955bb8567dc0a6b2e5349848581cb24cbc88cdd3eea40416155d9cf2f268fc52ceabe1b0eabc961bf1adff',
      ],
      [
        'complex map',
        '{"map": [{"k": {"int": 247426}, "v": {"map": [{"k": {"bytes": "44617465"}, "v": {"bytes": "41756775737420342c2032303231"}}, {"k": {"bytes": "50726f636573736f72"}, "v": {"bytes": "68747470733a2f2f6d616e7469732e66756e6374696f6e616c6c792e696f2f6d616e7469732e6d657461646174612e6a736f6e"}}, {"k": {"bytes": "536368656d61"}, "v": {"bytes": "68747470733a2f2f6d616e7469732e66756e6374696f6e616c6c792e696f2f736368656d612f3234373432362f76312e6a736f6e"}}, {"k": {"bytes": "53656c6563742053706f742050726963657320666f722044656c697665727920546f646179"}, "v": {"map": [{"k": {"bytes": "456c6563747269636974792028242f4d576829"}, "v": {"map": [{"k": {"bytes": "486f7573746f6e"}, "v": {"bytes": "34372e3030"}}, {"k": {"bytes": "4c6f75697369616e61"}, "v": {"bytes": "33392e3735"}}, {"k": {"bytes": "4d69642d41746c616e746963"}, "v": {"bytes": "34332e3738"}}, {"k": {"bytes": "4d696477657374"}, "v": {"bytes": "34322e3338"}}, {"k": {"bytes": "4e657720456e676c616e64"}, "v": {"bytes": "33392e3639"}}, {"k": {"bytes": "4e657720596f726b2043697479"}, "v": {"bytes": "34312e3439"}}, {"k": {"bytes": "4e6f72746865726e204341"}, "v": {"bytes": "39332e3037"}}, {"k": {"bytes": "4e6f72746877657374"}, "v": {"bytes": "3135322e3235"}}, {"k": {"bytes": "536f75746865726e204341"}, "v": {"bytes": "3130322e3230"}}, {"k": {"bytes": "536f75746877657374"}, "v": {"bytes": "3133322e3030"}}]}}, {"k": {"bytes": "4e61747572616c204761732028242f6d696c6c6f6e2042747529"}, "v": {"map": [{"k": {"bytes": "486f7573746f6e"}, "v": {"bytes": "332e3934"}}, {"k": {"bytes": "4c6f75697369616e61"}, "v": {"bytes": "342e3036"}}, {"k": {"bytes": "4d69642d41746c616e746963"}, "v": {"bytes": "332e3639"}}, {"k": {"bytes": "4d696477657374"}, "v": {"bytes": "332e3831"}}, {"k": {"bytes": "4e657720456e676c616e64"}, "v": {"bytes": "332e3735"}}, {"k": {"bytes": "4e657720596f726b2043697479"}, "v": {"bytes": "332e3632"}}, {"k": {"bytes": "4e6f72746865726e204341"}, "v": {"bytes": "352e3439"}}, {"k": {"bytes": "4e6f72746877657374"}, "v": {"bytes": "332e3737"}}, {"k": {"bytes": "536f75746865726e204341"}, "v": {"bytes": "362e3436"}}, {"k": {"bytes": "536f75746877657374"}, "v": {"bytes": "332e3838"}}]}}]}}, {"k": {"bytes": "536f75726365"}, "v": {"list": [{"bytes": "555320456e6572677920496e666f726d6174696f6e2041646d696e697374726174696f6e202845494129204461696c7920456e6572677920507269636573"}, {"bytes": "68747470733a2f2f7777772e6569612e676f762f746f646179696e656e657267792f7072696365732e706870"}, {"bytes": "697066733a2f2f516d6566483761546a4a42516a31775877667274594c697854454144574a3868366f3748454674656466665a5779"}]}}, {"k": {"bytes": "54696d657374616d70"}, "v": {"bytes": "323032312d30382d30345431323a33393a32392b30303a3030"}}, {"k": {"bytes": "57686f6c6573616c652053706f7420506574726f6c65756d20507269636573"}, "v": {"map": [{"k": {"bytes": "4372756465204f696c2028242f62617272656c29"}, "v": {"map": [{"k": {"bytes": "4272656e74"}, "v": {"bytes": "37332e3234"}}, {"k": {"bytes": "4c6f75697369616e61204c69676874"}, "v": {"bytes": "37312e3139"}}, {"k": {"bytes": "575449"}, "v": {"bytes": "37302e3634"}}]}}, {"k": {"bytes": "4761736f6c696e65202852424f42292028242f67616c6c6f6e29"}, "v": {"map": [{"k": {"bytes": "47756c6620436f617374"}, "v": {"bytes": "322e3235"}}, {"k": {"bytes": "4c6f7320416e67656c6573"}, "v": {"bytes": "322e3430"}}, {"k": {"bytes": "4e5920486172626f72"}, "v": {"bytes": "322e3330"}}]}}, {"k": {"bytes": "48656174696e67204f696c2028242f67616c6c6f6e29"}, "v": {"map": [{"k": {"bytes": "47756c6620436f617374"}, "v": {"bytes": "312e3739"}}, {"k": {"bytes": "4e5920486172626f72"}, "v": {"bytes": "312e3934"}}]}}, {"k": {"bytes": "4c6f772d53756c6675722044696573656c2028242f67616c6c6f6e29"}, "v": {"map": [{"k": {"bytes": "47756c6620436f617374"}, "v": {"bytes": "322e3037"}}, {"k": {"bytes": "4c6f7320416e67656c6573"}, "v": {"bytes": "322e3139"}}, {"k": {"bytes": "4e5920486172626f72"}, "v": {"bytes": "322e3132"}}]}}, {"k": {"bytes": "50726f70616e652028242f67616c6c6f6e29"}, "v": {"map": [{"k": {"bytes": "436f6e7761792c204b53"}, "v": {"bytes": "312e3031"}}, {"k": {"bytes": "4d6f6e742042656c766965752c205458"}, "v": {"bytes": "312e3039"}}]}}]}}]}}, {"k": {"int": 247427}, "v": {"map": [{"k": {"bytes": "50726f636573736f72"}, "v": {"bytes": "68747470733a2f2f6d616e7469732e66756e6374696f6e616c6c792e696f2f6d616e7469732e6d657461646174612e6a736f6e"}}, {"k": {"bytes": "534f4652"}, "v": {"map": [{"k": {"bytes": "65666665637469766544617465"}, "v": {"bytes": "323032312d30382d3033"}}, {"k": {"bytes": "70657263656e7452617465"}, "v": {"bytes": "302e3035"}}, {"k": {"bytes": "736f75726365"}, "v": {"bytes": "68747470733a2f2f6d61726b6574732e6e6577796f726b6665642e6f7267"}}]}}, {"k": {"bytes": "534f46525f314d4f4e5448"}, "v": {"map": [{"k": {"bytes": "41554732303231"}, "v": {"map": [{"k": {"bytes": "6f70656e"}, "v": {"bytes": "39392e39353235"}}, {"k": {"bytes": "736574746c65"}, "v": {"bytes": "323032312d30392d3031"}}]}}, {"k": {"bytes": "44454332303231"}, "v": {"map": [{"k": {"bytes": "6f70656e"}, "v": {"bytes": "39392e3935"}}, {"k": {"bytes": "736574746c65"}, "v": {"bytes": "323032322d30312d3033"}}]}}, {"k": {"bytes": "46454232303232"}, "v": {"map": [{"k": {"bytes": "6f70656e"}, "v": {"bytes": "39392e393535"}}, {"k": {"bytes": "736574746c65"}, "v": {"bytes": "323032322d30332d3031"}}]}}, {"k": {"bytes": "4a414e32303232"}, "v": {"map": [{"k": {"bytes": "6f70656e"}, "v": {"bytes": "39392e3935"}}, {"k": {"bytes": "736574746c65"}, "v": {"bytes": "323032322d30322d3031"}}]}}, {"k": {"bytes": "4a554c32303231"}, "v": {"map": [{"k": {"bytes": "6f70656e"}, "v": {"bytes": "39392e3935"}}, {"k": {"bytes": "736574746c65"}, "v": {"bytes": "323032312d30382d3032"}}]}}, {"k": {"bytes": "4d415232303232"}, "v": {"map": [{"k": {"bytes": "6f70656e"}, "v": {"bytes": "39392e3935"}}, {"k": {"bytes": "736574746c65"}, "v": {"bytes": "323032322d30342d3031"}}]}}, {"k": {"bytes": "4e4f5632303231"}, "v": {"map": [{"k": {"bytes": "6f70656e"}, "v": {"bytes": "39392e393535"}}, {"k": {"bytes": "736574746c65"}, "v": {"bytes": "323032312d31322d3031"}}]}}, {"k": {"bytes": "4f435432303231"}, "v": {"map": [{"k": {"bytes": "6f70656e"}, "v": {"bytes": "39392e3935"}}, {"k": {"bytes": "736574746c65"}, "v": {"bytes": "323032312d31312d3031"}}]}}, {"k": {"bytes": "53455032303231"}, "v": {"map": [{"k": {"bytes": "6f70656e"}, "v": {"bytes": "39392e3935"}}, {"k": {"bytes": "736574746c65"}, "v": {"bytes": "323032312d31302d3031"}}]}}]}}, {"k": {"bytes": "534f46525f334d4f4e5448"}, "v": {"map": [{"k": {"bytes": "44454332303231"}, "v": {"map": [{"k": {"bytes": "6f70656e"}, "v": {"bytes": "39392e393535"}}, {"k": {"bytes": "736574746c65"}, "v": {"bytes": "323032322d30332d3136"}}]}}, {"k": {"bytes": "44454332303232"}, "v": {"map": [{"k": {"bytes": "6f70656e"}, "v": {"bytes": "39392e373835"}}, {"k": {"bytes": "736574746c65"}, "v": {"bytes": "323032332d30332d3135"}}]}}, {"k": {"bytes": "44454332303233"}, "v": {"map": [{"k": {"bytes": "6f70656e"}, "v": {"bytes": "39392e343235"}}, {"k": {"bytes": "736574746c65"}, "v": {"bytes": "323032342d30332d3230"}}]}}, {"k": {"bytes": "4a554e32303231"}, "v": {"map": [{"k": {"bytes": "6f70656e"}, "v": {"bytes": "39392e39353235"}}, {"k": {"bytes": "736574746c65"}, "v": {"bytes": "323032312d30392d3135"}}]}}, {"k": {"bytes": "4a554e32303232"}, "v": {"map": [{"k": {"bytes": "6f70656e"}, "v": {"bytes": "39392e393235"}}, {"k": {"bytes": "736574746c65"}, "v": {"bytes": "323032322d30392d3231"}}]}}, {"k": {"bytes": "4a554e32303233"}, "v": {"map": [{"k": {"bytes": "6f70656e"}, "v": {"bytes": "39392e363135"}}, {"k": {"bytes": "736574746c65"}, "v": {"bytes": "323032332d30392d3230"}}]}}, {"k": {"bytes": "4d415232303232"}, "v": {"map": [{"k": {"bytes": "6f70656e"}, "v": {"bytes": "39392e3935"}}, {"k": {"bytes": "736574746c65"}, "v": {"bytes": "323032322d30362d3135"}}]}}, {"k": {"bytes": "4d415232303233"}, "v": {"map": [{"k": {"bytes": "6f70656e"}, "v": {"bytes": "39392e3731"}}, {"k": {"bytes": "736574746c65"}, "v": {"bytes": "323032332d30362d3231"}}]}}, {"k": {"bytes": "53455032303231"}, "v": {"map": [{"k": {"bytes": "6f70656e"}, "v": {"bytes": "39392e3935"}}, {"k": {"bytes": "736574746c65"}, "v": {"bytes": "323032312d31322d3135"}}]}}, {"k": {"bytes": "53455032303232"}, "v": {"map": [{"k": {"bytes": "6f70656e"}, "v": {"bytes": "39392e3837"}}, {"k": {"bytes": "736574746c65"}, "v": {"bytes": "323032322d31322d3231"}}]}}, {"k": {"bytes": "53455032303233"}, "v": {"map": [{"k": {"bytes": "6f70656e"}, "v": {"bytes": "39392e3532"}}, {"k": {"bytes": "736574746c65"}, "v": {"bytes": "323032332d31322d3230"}}]}}]}}, {"k": {"bytes": "536368656d61"}, "v": {"bytes": "68747470733a2f2f6d616e7469732e66756e6374696f6e616c6c792e696f2f736368656d612f3234373432372f76312e6a736f6e"}}, {"k": {"bytes": "54696d657374616d70"}, "v": {"bytes": "323032312d30382d30345431323a33393a32392b30303a3030"}}]}}]}',
        'a21a0003c682a744446174654e41756775737420342c20323032314950726f636573736f72583368747470733a2f2f6d616e7469732e66756e6374696f6e616c6c792e696f2f6d616e7469732e6d657461646174612e6a736f6e46536368656d61583468747470733a2f2f6d616e7469732e66756e6374696f6e616c6c792e696f2f736368656d612f3234373432362f76312e6a736f6e582553656c6563742053706f742050726963657320666f722044656c697665727920546f646179a253456c6563747269636974792028242f4d576829aa47486f7573746f6e4534372e3030494c6f75697369616e614533392e37354c4d69642d41746c616e7469634534332e3738474d6964776573744534322e33384b4e657720456e676c616e644533392e36394d4e657720596f726b20436974794534312e34394b4e6f72746865726e2043414539332e3037494e6f72746877657374463135322e32354b536f75746865726e204341463130322e323049536f75746877657374463133322e3030581a4e61747572616c204761732028242f6d696c6c6f6e2042747529aa47486f7573746f6e44332e3934494c6f75697369616e6144342e30364c4d69642d41746c616e74696344332e3639474d69647765737444332e38314b4e657720456e676c616e6444332e37354d4e657720596f726b204369747944332e36324b4e6f72746865726e20434144352e3439494e6f7274687765737444332e37374b536f75746865726e20434144362e343649536f7574687765737444332e383846536f757263659f583e555320456e6572677920496e666f726d6174696f6e2041646d696e697374726174696f6e202845494129204461696c7920456e6572677920507269636573582c68747470733a2f2f7777772e6569612e676f762f746f646179696e656e657267792f7072696365732e7068705835697066733a2f2f516d6566483761546a4a42516a31775877667274594c697854454144574a3868366f3748454674656466665a5779ff4954696d657374616d705819323032312d30382d30345431323a33393a32392b30303a3030581f57686f6c6573616c652053706f7420506574726f6c65756d20507269636573a5544372756465204f696c2028242f62617272656c29a3454272656e744537332e32344f4c6f75697369616e61204c696768744537312e3139435754494537302e3634581a4761736f6c696e65202852424f42292028242f67616c6c6f6e29a34a47756c6620436f61737444322e32354b4c6f7320416e67656c657344322e3430494e5920486172626f7244322e33305648656174696e67204f696c2028242f67616c6c6f6e29a24a47756c6620436f61737444312e3739494e5920486172626f7244312e3934581c4c6f772d53756c6675722044696573656c2028242f67616c6c6f6e29a34a47756c6620436f61737444322e30374b4c6f7320416e67656c657344322e3139494e5920486172626f7244322e31325250726f70616e652028242f67616c6c6f6e29a24a436f6e7761792c204b5344312e3031504d6f6e742042656c766965752c20545844312e30391a0003c683a64950726f636573736f72583368747470733a2f2f6d616e7469732e66756e6374696f6e616c6c792e696f2f6d616e7469732e6d657461646174612e6a736f6e44534f4652a34d656666656374697665446174654a323032312d30382d30334b70657263656e745261746544302e303546736f75726365581e68747470733a2f2f6d61726b6574732e6e6577796f726b6665642e6f72674b534f46525f314d4f4e5448a94741554732303231a2446f70656e4739392e3935323546736574746c654a323032312d30392d30314744454332303231a2446f70656e4539392e393546736574746c654a323032322d30312d30334746454232303232a2446f70656e4639392e39353546736574746c654a323032322d30332d3031474a414e32303232a2446f70656e4539392e393546736574746c654a323032322d30322d3031474a554c32303231a2446f70656e4539392e393546736574746c654a323032312d30382d3032474d415232303232a2446f70656e4539392e393546736574746c654a323032322d30342d3031474e4f5632303231a2446f70656e4639392e39353546736574746c654a323032312d31322d3031474f435432303231a2446f70656e4539392e393546736574746c654a323032312d31312d30314753455032303231a2446f70656e4539392e393546736574746c654a323032312d31302d30314b534f46525f334d4f4e5448ab4744454332303231a2446f70656e4639392e39353546736574746c654a323032322d30332d31364744454332303232a2446f70656e4639392e37383546736574746c654a323032332d30332d31354744454332303233a2446f70656e4639392e34323546736574746c654a323032342d30332d3230474a554e32303231a2446f70656e4739392e3935323546736574746c654a323032312d30392d3135474a554e32303232a2446f70656e4639392e39323546736574746c654a323032322d30392d3231474a554e32303233a2446f70656e4639392e36313546736574746c654a323032332d30392d3230474d415232303232a2446f70656e4539392e393546736574746c654a323032322d30362d3135474d415232303233a2446f70656e4539392e373146736574746c654a323032332d30362d32314753455032303231a2446f70656e4539392e393546736574746c654a323032312d31322d31354753455032303232a2446f70656e4539392e383746736574746c654a323032322d31322d32314753455032303233a2446f70656e4539392e353246736574746c654a323032332d31322d323046536368656d61583468747470733a2f2f6d616e7469732e66756e6374696f6e616c6c792e696f2f736368656d612f3234373432372f76312e6a736f6e4954696d657374616d705819323032312d30382d30345431323a33393a32392b30303a3030',
      ],
    ]

    for (const [name, schemaJson, cborHex] of testEntries) {
      const reEncode = (json) => JSON.stringify(JSON.parse(json))
      it(`json back and forth ${name}`, () => {
        const data = parseFromSchemaJson(schemaJson)
        const reSchemaJson = toSchemaJson(data)
        assert.deepEqual(reSchemaJson, reEncode(schemaJson))
      })

      it(`json to cbor ${name}`, () => {
        const data = parseFromSchemaJson(schemaJson)
        assert.deepEqual(encode(new CborizedTxDatum(data)).toString('hex'), cborHex)
      })
    }
  })

  describe('Hashing', () => {
    const hashes = [
      ['ee155ace9c40292074cb6aff8c9ccdd273c81648ff1149ef36bcea6ebb8a3e25', 1, 'integer'],
      ['ed33125018c5cbc9ae1b242a3ff8f3db2e108e4a63866d0b5238a34502c723ed', [1, 2], 'array'],
      [
        '04711f73707d78324dd8b3b091130333409f3faa47dfe19568cbdc01f28bcea7',
        [1, '2'],
        'array with string',
      ],
      [
        'dfb5b907900f2fb9569f290e2a1b680ac58401ce3b099aac01c9cee91dfe6bd5',
        new Map([[1, '1']]),
        'object with integer key',
      ],
      ['8fee320201d867c9408b4dc57e575f6a61241a5ec89cdc249979fd8b3a98f07c', {key: 'value'}, 'object'],
      [
        'de2a003d7f7d9f58d30eff5decc748bd84a977fb4af36ae8c56e4131020e6641',
        [{key: 'value'}, 1],
        'array with boject',
      ],
      [
        'ffdbd91b2680968f9624784bf14bdcb6713c2eb9f581be4a219663284056bef2',
        [{B: 'B'}, {A: 'A'}, {S: 'S', A: 'A'}],
        'mixed array',
      ],
      [
        '0c6e846f587d50a8f69c9664b1c76d7d156bf3cdf2c326e67bdb942651f9a91e',
        {
          widget: {
            debug: 'on',
            window: {
              title: 'Sample Konfabulator Widget',
              name: 'main_window',
              width: 500,
              height: 500,
            },
            image: {
              src: 'Images/Sun.png',
              name: 'sun1',
              hOffset: 250,
              vOffset: 250,
              alignment: 'center',
            },
            text: {
              data: 'Click Here',
              size: 36,
              style: 'bold',
              name: 'text1',
              hOffset: 250,
              vOffset: 100,
              alignment: 'center',
            },
          },
        },
        'large object 1',
      ],
      [
        'bd9e725f590694f90a6c9b56b6b8d4f850099053dad83b8db632a932cdb47ed7',
        {
          menu: {
            id: 'file',
            value: 'File',
            popup: {
              menuitem: [
                {value: 'New', onclick: 'CreateNewDoc'},
                {value: 'Open', onclick: 'OpenDoc'},
                {value: 'Close', onclick: 'CloseDoc'},
              ],
            },
          },
        },
        'large object 2',
      ],
      [
        'afc8362afe68c3dfe60cc68aac8911b40621bcaa7db0ac61dc91823606ea27ff',
        {a1: {a2: {a3: {a4: [1, 2, 3, 4], a1: 1}}}},
        'array object combo',
      ],
      ['ee7eee8b79053f79d8fb0ae7df9aaf2bea3054a5910e0c017bb7a5aeba2623fd', {a1: 1}, 'int values'],
    ]
    for (const entry of hashes) {
      it(`Hash ${entry[2]}`, () => {
        assert.equal(
          entry[0],
          hashSerialized(
            new CborizedTxDatum(entry[1] as unknown as TxDatum, CBOR_SORT_ORDER.ALPHABETICAL)
          )
        )
      })
    }
  })
})
