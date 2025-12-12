// Convert number to words in Indian format
export function numberToWords(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  function convertLessThanThousand(n: number): string {
    if (n === 0) return '';
    
    let result = '';
    
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      return result.trim();
    }
    
    if (n > 0) {
      result += ones[n] + ' ';
    }
    
    return result.trim();
  }

  // Handle negative numbers
  if (amount < 0) {
    return 'Minus ' + numberToWords(Math.abs(amount));
  }

  // Handle zero
  if (amount === 0) {
    return 'Zero Rupees Only';
  }

  // Split into rupees and paise
  let rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let result = '';

  // Indian numbering system: Crore, Lakh, Thousand, Hundred
  if (rupees >= 10000000) {
    result += convertLessThanThousand(Math.floor(rupees / 10000000)) + ' Crore ';
    rupees %= 10000000;
  }

  if (rupees >= 100000) {
    result += convertLessThanThousand(Math.floor(rupees / 100000)) + ' Lakh ';
    rupees %= 100000;
  }

  if (rupees >= 1000) {
    result += convertLessThanThousand(Math.floor(rupees / 1000)) + ' Thousand ';
    rupees %= 1000;
  }

  if (rupees > 0) {
    result += convertLessThanThousand(rupees);
  }

  result = result.trim() + ' Rupees';

  if (paise > 0) {
    result += ' and ' + convertLessThanThousand(paise) + ' Paise';
  }

  result += ' Only';

  return result;
}
