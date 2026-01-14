import jsPDF from 'jspdf';

export const generateSpellPDF = (spell) => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // Helper function to add text with wrapping
  const addText = (text, fontSize, isBold = false, color = [0, 0, 0]) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    pdf.setTextColor(...color);
    
    const lines = pdf.splitTextToSize(text, contentWidth);
    
    // Check if we need a new page
    if (yPosition + (lines.length * fontSize * 0.5) > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }
    
    pdf.text(lines, margin, yPosition);
    yPosition += lines.length * fontSize * 0.5 + 5;
  };

  // Header with decorative line
  pdf.setFillColor(125, 94, 79); // #7D5E4F
  pdf.rect(margin, yPosition, contentWidth, 3, 'F');
  yPosition += 10;

  // Title
  addText(spell.title, 22, true, [125, 94, 79]);
  yPosition += 2;

  // Category and metadata
  const metadata = `${spell.category} • ${spell.timeRequired} • ${spell.skillLevel}`;
  addText(metadata, 10, false, [157, 123, 107]);
  yPosition += 8;

  // When to Use
  addText('When to Use', 14, true, [125, 94, 79]);
  addText(spell.whenToUse, 11, false);
  yPosition += 5;

  // Vibe (if exists)
  if (spell.vibe) {
    addText('Vibe', 14, true, [125, 94, 79]);
    addText(spell.vibe, 11, false);
    yPosition += 5;
  }

  // Supplies Needed (if exists)
  if (spell.suppliesNeeded) {
    addText('Supplies Needed', 14, true, [125, 94, 79]);
    addText(spell.suppliesNeeded, 11, false);
    yPosition += 5;
  }

  // What You Need
  addText('What You Need', 14, true, [125, 94, 79]);
  const ingredients = spell.ingredients.split('\n').filter(i => i.trim());
  ingredients.forEach(ingredient => {
    addText(`• ${ingredient.trim()}`, 11, false);
  });
  yPosition += 5;

  // How to Do It
  addText('How to Do It', 14, true, [125, 94, 79]);
  const instructions = spell.instructions.split('\n').filter(i => i.trim());
  instructions.forEach((instruction, index) => {
    addText(`${index + 1}. ${instruction.trim()}`, 11, false);
  });
  yPosition += 5;

  // Spoken Intention (if exists)
  if (spell.spokenIntention) {
    addText('Spoken Intention', 14, true, [125, 94, 79]);
    pdf.setFillColor(245, 243, 239);
    const intentionHeight = pdf.splitTextToSize(`"${spell.spokenIntention}"`, contentWidth - 10).length * 5.5 + 8;
    
    if (yPosition + intentionHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }
    
    pdf.rect(margin, yPosition, contentWidth, intentionHeight, 'F');
    yPosition += 5;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(125, 94, 79);
    const intentionLines = pdf.splitTextToSize(`"${spell.spokenIntention}"`, contentWidth - 10);
    pdf.text(intentionLines, margin + 5, yPosition);
    yPosition += intentionLines.length * 5.5 + 8;
  }

  // Tips (if exists)
  if (spell.tips) {
    addText('Tips & Modifications', 14, true, [125, 94, 79]);
    addText(spell.tips, 11, false);
  }

  // Footer
  yPosition = pageHeight - 15;
  pdf.setFontSize(8);
  pdf.setTextColor(157, 123, 107);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Edge & Altar • Practical Magic for Busy People', pageWidth / 2, yPosition, { align: 'center' });

  // Save the PDF
  const fileName = `${spell.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_spell_card.pdf`;
  pdf.save(fileName);
};