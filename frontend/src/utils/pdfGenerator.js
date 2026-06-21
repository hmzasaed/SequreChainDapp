// PDF Generation utility for Evidence details
export async function generateEvidencePDF(evidence) {
  try {
    // Web: use jsPDF; Native: try expo-print HTML fallback
    const isWeb = typeof window !== 'undefined' && !!window.document;
    let doc = null;
    let usingJsPDF = false;
    if (isWeb) {
      // Load jsPDF via CDN at runtime to avoid Metro bundler attempting to require it
      if (!window.jspdf || !window.jspdf.jsPDF) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = (e) => reject(new Error('Failed to load jsPDF from CDN'));
          document.head.appendChild(script);
        });
      }
      const jsPDFGlobal = window.jspdf && window.jspdf.jsPDF ? window.jspdf.jsPDF : (window.jsPDF || null);
      if (!jsPDFGlobal) throw new Error('jsPDF is not available on window after loading CDN');
      doc = new jsPDFGlobal({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      usingJsPDF = true;
    }

    let pageWidth = 210;
    let pageHeight = 297;
    let yPos = 20;
    if (usingJsPDF) {
      pageWidth = doc.internal.pageSize.getWidth();
      pageHeight = doc.internal.pageSize.getHeight();
    }

    // Set colors
    const primaryColor = [26, 86, 219]; // #1A56DB
    const darkColor = [15, 52, 96]; // #0F3460
    const textColor = [51, 65, 85]; // #334155
    const lightGray = [241, 245, 249]; // #f1f5f9

    // Header
    doc.setFillColor(...darkColor);
    doc.rect(0, 0, pageWidth, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('EVIDENCE REPORT', 15, 18);

    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 25);

    yPos = 40;

    // Helper function to add section
    const addSection = (title) => {
      if (usingJsPDF) {
        doc.setFillColor(...primaryColor);
        doc.rect(15, yPos, pageWidth - 30, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(title, 18, yPos + 6);
        yPos += 12;
        doc.setTextColor(...textColor);
      } else {
        // for HTML fallback we just increment yPos (not used)
        yPos += 0;
      }
    };

    // Helper function to add row
    const addRow = (label, value, mono = false) => {
      if (usingJsPDF) {
        const labelWidth = 50;
        const valueX = labelWidth + 20;
        const maxWidth = pageWidth - valueX - 20;

        doc.setFont(undefined, 'bold');
        doc.setFontSize(9);
        doc.text(label + ':', 18, yPos);

        doc.setFont(mono ? 'courier' : undefined, 'normal');
        doc.setFontSize(8);
        
        // Handle long text wrapping
        const splitValue = doc.splitTextToSize(value || '—', maxWidth);
        doc.text(splitValue, valueX, yPos);

        yPos += 5 + (splitValue.length - 1) * 4;

        // Check if we need a new page
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
      } else {
        // HTML fallback: nothing to do here
      }
    };

    // Evidence Information Section
    addSection('EVIDENCE INFORMATION');
    addRow('Evidence ID', evidence.evidence_id, true);
    addRow('Description', evidence.description || '—');
    addRow('Type', evidence.evidence_type);
    addRow('Location', evidence.location || '—');
    addRow('Uploaded By', evidence.uploaded_by || evidence.uploader_name, true);
    addRow('Date Uploaded', evidence.created_at ? new Date(evidence.created_at).toLocaleString() : '—');
    addRow('Case Number', evidence.case_number || '—');
    addRow('Status', evidence.status?.toUpperCase() || '—');

    yPos += 5;

    // Blockchain Record Section
    addSection('BLOCKCHAIN RECORD');
    addRow('Blockchain Network', 'Ethereum Sepolia');
    addRow('Transaction Hash', evidence.tx_hash || 'Pending', true);
    addRow('Block Number', evidence.block_number?.toString() || 'Pending');
    addRow('File Hash (SHA-256)', evidence.file_hash || '—', true);
    addRow('IPFS CID', evidence.cid || '—', true);

    // Add clickable IPFS gateway link when available
    if (evidence.cid) {
      const linkLabel = 'IPFS Link:';
      const linkUrl = `https://gateway.pinata.cloud/ipfs/${evidence.cid}`;
      const labelX = 18;
      const labelY = yPos;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.text(linkLabel, labelX, labelY);

      const valueX = 18 + 50 + 2; // follow addRow spacing
      const maxWidth = pageWidth - valueX - 20;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      const linkText = linkUrl;
      const splitLink = doc.splitTextToSize(linkText, maxWidth);
      // print link text
      doc.setTextColor(0, 102, 204);
      doc.text(splitLink, valueX, labelY);
      // add actual link area for first line
      const firstLine = splitLink[0] || linkText;
      const textWidth = doc.getTextWidth(firstLine);
      const linkHeight = 4;
      // doc.link uses coordinates in current units (mm)
      doc.link(valueX, labelY - 3, textWidth, linkHeight, { url: linkUrl });
      // restore text color
      doc.setTextColor(...textColor);

      yPos += 5 + (splitLink.length - 1) * 4;
    }

    yPos += 5;

    // File Information Section
    addSection('FILE INFORMATION');
    addRow('File Name', evidence.file_name);
    addRow('File Size', evidence.file_size ? `${(evidence.file_size / 1024).toFixed(1)} KB` : '—');
    addRow('MIME Type', evidence.mime_type || '—');

    if (usingJsPDF) {
      // Footer
      doc.setTextColor(...lightGray);
      doc.setFontSize(8);
      doc.text(`Page 1 of ${doc.internal.pages.length - 1}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Save the PDF - prefer blob download in browser for better compatibility
      const fileName = `evidence_${evidence.evidence_id}_${new Date().getTime()}.pdf`;
      try {
        if (typeof window !== 'undefined' && window.document && typeof URL !== 'undefined') {
          const blob = doc.output('blob');
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          // revoke after short timeout to allow download to start
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } else {
          // fallback to jsPDF save (works in some environments)
          doc.save(fileName);
        }
        return { success: true, fileName };
      } catch (e) {
        // fallback: try doc.save and return success if no exception
        try { doc.save(fileName); return { success: true, fileName }; } catch (err) { throw err; }
      }
    } else {
      // Native fallback: try expo-print (HTML -> PDF)
      try {
        const Print = await import('expo-print');
        // Build minimal HTML report including an IPFS link
        const html = `
          <html>
            <head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="font-family: Arial, Helvetica, sans-serif; color: #333; padding: 12px;">
              <h2>EVIDENCE REPORT</h2>
              <p>Generated: ${new Date().toLocaleString()}</p>
              <h3>Evidence Information</h3>
              <p><strong>Evidence ID:</strong> ${evidence.evidence_id}</p>
              <p><strong>Description:</strong> ${evidence.description || '—'}</p>
              <p><strong>Type:</strong> ${evidence.evidence_type}</p>
              <p><strong>Location:</strong> ${evidence.location || '—'}</p>
              <p><strong>Uploaded By:</strong> ${evidence.uploaded_by || evidence.uploader_name || '—'}</p>
              <p><strong>Date Uploaded:</strong> ${evidence.created_at ? new Date(evidence.created_at).toLocaleString() : '—'}</p>
              <h3>Blockchain Record</h3>
              <p><strong>Transaction Hash:</strong> ${evidence.tx_hash || 'Pending'}</p>
              <p><strong>Block Number:</strong> ${evidence.block_number?.toString() || 'Pending'}</p>
              <p><strong>File Hash (SHA-256):</strong> ${evidence.file_hash || '—'}</p>
              <p><strong>IPFS CID:</strong> ${evidence.cid || '—'}</p>
              ${evidence.cid ? `<p><strong>IPFS Link:</strong> <a href="https://gateway.pinata.cloud/ipfs/${evidence.cid}">https://gateway.pinata.cloud/ipfs/${evidence.cid}</a></p>` : ''}
              <h3>File Information</h3>
              <p><strong>File Name:</strong> ${evidence.file_name || '—'}</p>
              <p><strong>File Size:</strong> ${evidence.file_size ? `${(evidence.file_size/1024).toFixed(1)} KB` : '—'}</p>
            </body>
          </html>
        `;
        const { uri } = await Print.printToFileAsync({ html });
        return { success: true, uri };
      } catch (err) {
        console.error('Native PDF generation error:', err);
        return { success: false, error: err.message || String(err) };
      }
    }
  } catch (error) {
    console.error('PDF Generation Error:', error);
    return { success: false, error: error.message };
  }
}
