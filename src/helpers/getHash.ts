/*
 Source: https://gist.github.com/iperelivskiy/4110988
*/
export function getHash(s) {
  let h = 0xdeadbeef
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 2654435761)
  }
  return ((h ^ (h >>> 16)) >>> 0).toString(16)
}
