// Picks the Korean particle that matches the last syllable of a word,
// e.g. josa('사오정', '이', '가') -> '사오정이', josa('저팔계', '을', '를') -> '저팔계를'.
export function josa(word: string, afterConsonant: string, afterVowel: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasFinalConsonant = code >= 0 && code <= 11171 && code % 28 !== 0;
  return word + (hasFinalConsonant ? afterConsonant : afterVowel);
}
