import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { format } from 'date-fns';
import { 
  FileText, 
  Printer, 
  X,
  CreditCard,
  DollarSign,
  Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import type { FolioStatement, FolioPosting } from '@/types/folio';

interface FolioViewerProps {
  folio: FolioStatement;
  onClose?: () => void;
  onPayment?: () => void;
  onPrint?: () => void;
}

export const FolioViewer: React.FC<FolioViewerProps> = ({ 
  folio, 
  onClose, 
  onPayment,
  onPrint 
}) => {

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      // Open new page with print/export buttons at bottom
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to print the folio statement');
        return;
      }

      const printContent = generatePrintableHTMLWithButtons();
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  const handleExportPDF = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // Title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FOLIO STATEMENT', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Folio info
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Folio Number: ${folio.folio_number}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;
    pdf.text(`Created: ${format(new Date(folio.created_at), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;
    if (folio.booking_id) {
      pdf.text(`Booking ID: ${folio.booking_id}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
    }
    yPosition += 10;

    // Room Charges
    if (folio.postings_by_type.room_charges.length > 0) {
      yPosition = addPDFSection(pdf, 'Room Charges', folio.postings_by_type.room_charges, yPosition);
    }

    // POS Charges
    if (folio.postings_by_type.pos_charges.length > 0) {
      yPosition = addPDFSection(pdf, 'Restaurant & Services', folio.postings_by_type.pos_charges, yPosition);
    }

    // Surcharges
    if (folio.postings_by_type.surcharges.length > 0) {
      yPosition = addPDFSection(pdf, 'Surcharges', folio.postings_by_type.surcharges, yPosition);
    }

    // Discounts
    if (folio.postings_by_type.discounts.length > 0) {
      yPosition = addPDFSection(pdf, 'Discounts', folio.postings_by_type.discounts, yPosition);
    }

    // Taxes
    if (folio.postings_by_type.taxes.length > 0) {
      yPosition = addPDFSection(pdf, 'Taxes', folio.postings_by_type.taxes, yPosition);
    }

    // Payments & Credits
    const hasCredits = folio.postings_by_type.deposits.length > 0 || 
                      folio.postings_by_type.payments.length > 0 || 
                      folio.postings_by_type.refunds.length > 0;
    
    if (hasCredits) {
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Payments & Credits', 20, yPosition);
      yPosition += 10;

      const allCredits = [
        ...folio.postings_by_type.deposits.map(d => ({ ...d, type: 'Deposit' })),
        ...folio.postings_by_type.payments.map(p => ({ ...p, type: 'Payment' })),
        ...folio.postings_by_type.refunds.map(r => ({ ...r, type: 'Refund' }))
      ];

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      allCredits.forEach(credit => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(`${credit.type}: ${credit.description}`, 25, yPosition);
        pdf.text(formatCurrency(Math.abs(credit.total)), 150, yPosition, { align: 'right' });
        yPosition += 5;
      });
      yPosition += 10;
    }

    // Summary
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Summary', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    const summaryItems = [
      { label: 'Room Charges', amount: folio.summary.room_charges },
      ...(folio.summary.pos_charges > 0 ? [{ label: 'POS Charges', amount: folio.summary.pos_charges }] : []),
      ...(folio.summary.surcharges > 0 ? [{ label: 'Surcharges', amount: folio.summary.surcharges }] : []),
      ...(folio.summary.discounts !== 0 ? [{ label: 'Discounts', amount: folio.summary.discounts }] : []),
      { label: 'Subtotal', amount: folio.summary.subtotal, isBold: true },
      { label: 'Taxes', amount: folio.summary.taxes },
      { label: 'Grand Total', amount: folio.summary.grand_total, isBold: true },
      ...(folio.summary.total_credits !== 0 ? [{ label: 'Total Credits', amount: -Math.abs(folio.summary.total_credits) }] : []),
      ...(folio.summary.total_credits !== 0 ? [{ label: 'Balance Due', amount: folio.summary.balance_due, isBold: true }] : [])
    ];

    summaryItems.forEach(item => {
      if (item.isBold) {
        pdf.setFont('helvetica', 'bold');
      } else {
        pdf.setFont('helvetica', 'normal');
      }
      pdf.text(item.label, 25, yPosition);
      pdf.text(formatCurrency(item.amount), 150, yPosition, { align: 'right' });
      yPosition += 5;
    });

    // Footer
    yPosition = pageHeight - 15;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, yPosition, { align: 'center' });

    // Save PDF
    pdf.save(`Folio-${folio.folio_number}.pdf`);
  };

  const addPDFSection = (pdf: jsPDF, title: string, postings: any[], yPosition: number) => {
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, 20, yPosition);
    yPosition += 8;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    postings.forEach(posting => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
      }
      
      const date = format(new Date(posting.date), 'dd/MM/yyyy');
      const description = posting.description + (posting.reference ? ` (${posting.reference})` : '');
      const amount = formatCurrency(posting.amount);
      const tax = posting.tax > 0 ? formatCurrency(posting.tax) : '-';
      const total = formatCurrency(posting.total);
      
      pdf.text(date, 20, yPosition);
      pdf.text(description.substring(0, 40), 45, yPosition);
      pdf.text(posting.quantity.toString(), 110, yPosition, { align: 'center' });
      pdf.text(amount, 130, yPosition, { align: 'right' });
      pdf.text(tax, 150, yPosition, { align: 'right' });
      pdf.text(total, 175, yPosition, { align: 'right' });
      
      yPosition += 5;
    });
    
    return yPosition + 10;
  };

  const generatePrintableHTMLWithButtons = () => {
    const formattedDate = format(new Date(folio.created_at), 'dd/MM/yyyy HH:mm');
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Folio Statement - ${folio.folio_number}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              color: #333;
              line-height: 1.4;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #333; 
              padding-bottom: 20px; 
            }
            .folio-info { 
              margin-bottom: 20px; 
              text-align: center;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px; 
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 8px; 
              text-align: left; 
            }
            th { 
              background-color: #f5f5f5; 
              font-weight: bold;
            }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .summary { 
              background-color: #f9f9f9; 
              padding: 15px; 
              border: 1px solid #ddd; 
              margin-top: 20px;
            }
            .summary h3 { margin-top: 0; }
            .summary-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 5px 0; 
            }
            .balance-due { 
              font-size: 18px; 
              font-weight: bold; 
              color: ${folio.summary.balance_due > 0 ? '#dc2626' : '#16a34a'};
              border-top: 2px solid #333;
              padding-top: 10px;
              margin-top: 10px;
            }
            .section-title { 
              font-size: 16px; 
              font-weight: bold; 
              margin: 20px 0 10px 0;
              color: #333;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>FOLIO STATEMENT</h1>
            <div class="folio-info">
              <p><strong>Folio Number:</strong> ${folio.folio_number}</p>
              <p><strong>Created:</strong> ${formattedDate}</p>
              ${folio.booking_id ? `<p><strong>Booking ID:</strong> ${folio.booking_id}</p>` : ''}
            </div>
          </div>

          ${generatePostingsTableHTML('Room Charges', folio.postings_by_type.room_charges)}
          ${generatePostingsTableHTML('Restaurant & Services', folio.postings_by_type.pos_charges)}
          ${generatePostingsTableHTML('Surcharges', folio.postings_by_type.surcharges)}
          ${generatePostingsTableHTML('Discounts', folio.postings_by_type.discounts)}
          ${generatePostingsTableHTML('Taxes', folio.postings_by_type.taxes)}
          ${generateCreditsHTML()}
          ${generateSummaryHTML()}
          
          <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
            <p>Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          </div>
          
          <!-- Print and Export Buttons -->
          <div style="margin-top: 30px; text-align: center; padding: 20px; border-top: 2px solid #333;">
            <button onclick="window.print()" style="
              background: #000;
              color: white;
              border: none;
              padding: 12px 24px;
              margin: 0 10px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
            ">🖨️ Print</button>
            <button onclick="exportToPDF()" style="
              background: transparent;
              color: #000;
              border: 1px solid #ccc;
              padding: 12px 24px;
              margin: 0 10px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
            ">📄 Export as PDF</button>
          </div>
          
          <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
          <script>
            function exportToPDF() {
              const { jsPDF } = window.jspdf;
              const pdf = new jsPDF();
              const pageWidth = pdf.internal.pageSize.getWidth();
              const pageHeight = pdf.internal.pageSize.getHeight();
              let yPosition = 20;

              // Title
              pdf.setFontSize(20);
              pdf.setFont('helvetica', 'bold');
              pdf.text('FOLIO STATEMENT', pageWidth / 2, yPosition, { align: 'center' });
              yPosition += 15;

              // Folio info
              pdf.setFontSize(10);
              pdf.setFont('helvetica', 'normal');
              pdf.text('Folio Number: ${folio.folio_number}', pageWidth / 2, yPosition, { align: 'center' });
              yPosition += 5;
              pdf.text('Created: ${format(new Date(folio.created_at), 'dd/MM/yyyy HH:mm')}', pageWidth / 2, yPosition, { align: 'center' });
              yPosition += 5;
              ${folio.booking_id ? `pdf.text('Booking ID: ${folio.booking_id}', pageWidth / 2, yPosition, { align: 'center' });` : ''}
              yPosition += 10;

              // Add content sections
              yPosition = addSection(pdf, 'Room Charges', ${JSON.stringify(folio.postings_by_type.room_charges)}, yPosition);
              yPosition = addSection(pdf, 'POS Charges', ${JSON.stringify(folio.postings_by_type.pos_charges)}, yPosition);
              yPosition = addSection(pdf, 'Summary', [], yPosition);

              // Footer
              pdf.setFontSize(8);
              pdf.setFont('helvetica', 'normal');
              pdf.text('Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')}', pageWidth / 2, pageHeight - 15, { align: 'center' });

              // Save PDF
              pdf.save('Folio-${folio.folio_number}.pdf');
            }

            function addSection(pdf, title, postings, yPos) {
              const pageHeight = pdf.internal.pageSize.getHeight();
              
              if (yPos > pageHeight - 40) {
                pdf.addPage();
                yPos = 20;
              }

              pdf.setFontSize(12);
              pdf.setFont('helvetica', 'bold');
              pdf.text(title, 20, yPos);
              yPos += 8;

              if (postings && postings.length > 0) {
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'normal');
                
                postings.forEach(posting => {
                  if (yPos > pageHeight - 20) {
                    pdf.addPage();
                    yPos = 20;
                  }
                  
                  pdf.text(posting.description || '', 20, yPos);
                  pdf.text((posting.total || 0).toLocaleString('vi-VN') + ' đ', 175, yPos, { align: 'right' });
                  yPos += 5;
                });
              }
              
              return yPos + 10;
            }
          </script>
        </body>
      </html>
    `;
  };

  const generatePostingsTableHTML = (title: string, postings: any[]) => {
    if (!postings || postings.length === 0) return '';
    
    return `
      <div class="section-title">${title}</div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th class="text-center">Qty</th>
            <th class="text-right">Unit Price</th>
            <th class="text-right">Amount</th>
            <th class="text-right">Tax</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${postings.map(posting => `
            <tr ${posting.is_void ? 'style="opacity: 0.5; text-decoration: line-through;"' : ''}>
              <td>${format(new Date(posting.date), 'dd/MM/yyyy')}</td>
              <td>
                ${posting.description}
                ${posting.reference ? `<br><small>(Ref: ${posting.reference})</small>` : ''}
                ${posting.is_void && posting.void_reason ? `<br><small style="color: #dc2626;">Voided: ${posting.void_reason}</small>` : ''}
              </td>
              <td class="text-center">${posting.quantity}</td>
              <td class="text-right">${posting.unit_price > 0 ? formatCurrency(posting.unit_price) : '-'}</td>
              <td class="text-right">${formatCurrency(posting.amount)}</td>
              <td class="text-right">${posting.tax > 0 ? formatCurrency(posting.tax) : '-'}</td>
              <td class="text-right"><strong>${formatCurrency(posting.total)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  const generateCreditsHTML = () => {
    const hasCredits = folio.postings_by_type.deposits.length > 0 || 
                      folio.postings_by_type.payments.length > 0 || 
                      folio.postings_by_type.refunds.length > 0;
    
    if (!hasCredits) return '';

    return `
      <div class="section-title">Payments & Credits</div>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Description</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${folio.postings_by_type.deposits.map(deposit => `
            <tr>
              <td>Deposit</td>
              <td>${deposit.description}</td>
              <td class="text-right">${formatCurrency(Math.abs(deposit.total))}</td>
            </tr>
          `).join('')}
          ${folio.postings_by_type.payments.map(payment => `
            <tr>
              <td>Payment</td>
              <td>${payment.description}</td>
              <td class="text-right">${formatCurrency(Math.abs(payment.total))}</td>
            </tr>
          `).join('')}
          ${folio.postings_by_type.refunds.map(refund => `
            <tr>
              <td>Refund</td>
              <td>${refund.description}</td>
              <td class="text-right" style="color: #dc2626;">${formatCurrency(Math.abs(refund.total))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  const generateSummaryHTML = () => {
    return `
      <div class="summary">
        <h3>Summary</h3>
        <div class="summary-row">
          <span>Room Charges</span>
          <span>${formatCurrency(folio.summary.room_charges)}</span>
        </div>
        ${folio.summary.pos_charges > 0 ? `
          <div class="summary-row">
            <span>POS Charges</span>
            <span>${formatCurrency(folio.summary.pos_charges)}</span>
          </div>
        ` : ''}
        ${folio.summary.surcharges > 0 ? `
          <div class="summary-row">
            <span>Surcharges</span>
            <span>${formatCurrency(folio.summary.surcharges)}</span>
          </div>
        ` : ''}
        ${folio.summary.discounts !== 0 ? `
          <div class="summary-row" style="color: #16a34a;">
            <span>Discounts</span>
            <span>${formatCurrency(folio.summary.discounts)}</span>
          </div>
        ` : ''}
        <hr>
        <div class="summary-row" style="font-weight: bold;">
          <span>Subtotal</span>
          <span>${formatCurrency(folio.summary.subtotal)}</span>
        </div>
        <div class="summary-row">
          <span>Taxes</span>
          <span>${formatCurrency(folio.summary.taxes)}</span>
        </div>
        <hr>
        <div class="summary-row" style="font-size: 16px; font-weight: bold;">
          <span>Grand Total</span>
          <span>${formatCurrency(folio.summary.grand_total)}</span>
        </div>
        ${folio.summary.total_credits !== 0 ? `
          <div class="summary-row" style="color: #16a34a;">
            <span>Total Credits</span>
            <span>- ${formatCurrency(Math.abs(folio.summary.total_credits))}</span>
          </div>
          <div class="summary-row balance-due">
            <span>Balance Due</span>
            <span>${formatCurrency(folio.summary.balance_due)}</span>
          </div>
        ` : ''}
        ${folio.is_closed ? `
          <div style="text-align: center; margin-top: 15px; font-style: italic;">
            Folio Closed ${folio.closed_at ? `on ${format(new Date(folio.closed_at), 'dd/MM/yyyy HH:mm')}` : ''}
          </div>
        ` : ''}
      </div>
    `;
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const getPostingTypeBadge = (type: FolioPosting['type']) => {
    const badges: Record<FolioPosting['type'], { variant: any; label: string }> = {
      room: { variant: 'default', label: 'Room' },
      pos: { variant: 'secondary', label: 'POS' },
      surcharge: { variant: 'destructive', label: 'Surcharge' },
      discount: { variant: 'success', label: 'Discount' },
      tax: { variant: 'outline', label: 'Tax' },
      deposit: { variant: 'info', label: 'Deposit' },
      payment: { variant: 'success', label: 'Payment' },
      refund: { variant: 'warning', label: 'Refund' },
      adjustment: { variant: 'secondary', label: 'Adjustment' }
    };
    return badges[type] || { variant: 'default', label: type };
  };

  const renderPostingsSection = (title: string, postings: FolioPosting[], showType: boolean = false) => {
    if (!postings || postings.length === 0) return null;

    return (
      <div className="mb-6">
        <h4 className="font-semibold mb-2">{title}</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              {showType && <TableHead>Type</TableHead>}
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Qty</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Tax</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {postings.map((posting) => (
              <TableRow key={posting.id} className={posting.is_void ? 'opacity-50 line-through' : ''}>
                <TableCell>{format(new Date(posting.date), 'dd/MM/yyyy')}</TableCell>
                {showType && (
                  <TableCell>
                    <Badge {...getPostingTypeBadge(posting.type)}>
                      {getPostingTypeBadge(posting.type).label}
                    </Badge>
                  </TableCell>
                )}
                <TableCell>
                  {posting.description}
                  {posting.reference && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (Ref: {posting.reference})
                    </span>
                  )}
                  {posting.is_void && posting.void_reason && (
                    <span className="text-xs text-destructive ml-2">
                      Voided: {posting.void_reason}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-center">{posting.quantity}</TableCell>
                <TableCell className="text-right">
                  {posting.unit_price > 0 ? formatCurrency(posting.unit_price) : '-'}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(posting.amount)}</TableCell>
                <TableCell className="text-right">
                  {posting.tax > 0 ? formatCurrency(posting.tax) : '-'}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(posting.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Folio Statement</CardTitle>
            <p className="text-muted-foreground">
              {folio.folio_number} • Created: {format(new Date(folio.created_at), 'dd/MM/yyyy HH:mm')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Room Charges */}
          {renderPostingsSection('Room Charges', folio.postings_by_type.room_charges)}

          {/* POS Charges */}
          {renderPostingsSection('Restaurant & Services', folio.postings_by_type.pos_charges)}

          {/* Surcharges */}
          {renderPostingsSection('Surcharges', folio.postings_by_type.surcharges)}

          {/* Discounts */}
          {renderPostingsSection('Discounts', folio.postings_by_type.discounts)}

          {/* Taxes */}
          {renderPostingsSection('Taxes', folio.postings_by_type.taxes)}

          <Separator />

          {/* Payments and Deposits */}
          <div className="space-y-4">
            <h4 className="font-semibold">Payments & Credits</h4>
            <div className="grid grid-cols-2 gap-4">
              {folio.postings_by_type.deposits.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Deposits</p>
                  {folio.postings_by_type.deposits.map((deposit) => (
                    <div key={deposit.id} className="flex justify-between">
                      <span className="text-sm">{deposit.description}</span>
                      <span className="text-sm font-medium">{formatCurrency(Math.abs(deposit.total))}</span>
                    </div>
                  ))}
                </div>
              )}
              {folio.postings_by_type.payments.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Payments</p>
                  {folio.postings_by_type.payments.map((payment) => (
                    <div key={payment.id} className="flex justify-between">
                      <span className="text-sm">{payment.description}</span>
                      <span className="text-sm font-medium">{formatCurrency(Math.abs(payment.total))}</span>
                    </div>
                  ))}
                </div>
              )}
              {folio.postings_by_type.refunds.length > 0 && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Refunds</p>
                  {folio.postings_by_type.refunds.map((refund) => (
                    <div key={refund.id} className="flex justify-between">
                      <span className="text-sm">{refund.description}</span>
                      <span className="text-sm font-medium text-destructive">
                        {formatCurrency(Math.abs(refund.total))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Summary */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="font-semibold mb-4">Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Room Charges</span>
                <span>{formatCurrency(folio.summary.room_charges)}</span>
              </div>
              {folio.summary.pos_charges > 0 && (
                <div className="flex justify-between">
                  <span>POS Charges</span>
                  <span>{formatCurrency(folio.summary.pos_charges)}</span>
                </div>
              )}
              {folio.summary.surcharges > 0 && (
                <div className="flex justify-between">
                  <span>Surcharges</span>
                  <span>{formatCurrency(folio.summary.surcharges)}</span>
                </div>
              )}
              {folio.summary.discounts !== 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discounts</span>
                  <span>{formatCurrency(folio.summary.discounts)}</span>
                </div>
              )}
              
              <Separator className="my-2" />
              
              <div className="flex justify-between font-medium">
                <span>Subtotal</span>
                <span>{formatCurrency(folio.summary.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes</span>
                <span>{formatCurrency(folio.summary.taxes)}</span>
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex justify-between text-lg font-semibold">
                <span>Grand Total</span>
                <span>{formatCurrency(folio.summary.grand_total)}</span>
              </div>
              
              {folio.summary.total_credits !== 0 && (
                <>
                  <div className="flex justify-between text-green-600">
                    <span>Total Credits</span>
                    <span>- {formatCurrency(Math.abs(folio.summary.total_credits))}</span>
                  </div>
                  
                  <Separator className="my-2" />
                  
                  <div className={`flex justify-between text-xl font-bold ${folio.summary.balance_due > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    <span>Balance Due</span>
                    <span>{formatCurrency(folio.summary.balance_due)}</span>
                  </div>
                </>
              )}
            </div>

            {folio.summary.balance_due > 0 && onPayment && (
              <Button 
                className="w-full mt-4" 
                onClick={onPayment}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Make Payment ({formatCurrency(folio.summary.balance_due)})
              </Button>
            )}

            {folio.summary.balance_due < 0 && (
              <Badge variant="success" className="w-full mt-4 justify-center py-2">
                <DollarSign className="h-4 w-4 mr-1" />
                Credit Balance: {formatCurrency(Math.abs(folio.summary.balance_due))}
              </Badge>
            )}

            {folio.summary.balance_due === 0 && (
              <Badge variant="success" className="w-full mt-4 justify-center py-2">
                ✓ Fully Paid
              </Badge>
            )}
          </div>

          {folio.is_closed && (
            <Badge variant="secondary" className="w-full justify-center py-2">
              <FileText className="h-4 w-4 mr-1" />
              Folio Closed {folio.closed_at && `on ${format(new Date(folio.closed_at), 'dd/MM/yyyy HH:mm')}`}
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
};