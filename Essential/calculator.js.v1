function calculate() {
    // 1. Gather Inputs
    const entryAge = parseInt(document.getElementById('entryAge').value);
    const premium = parseFloat(document.getElementById('annualPremium').value);
    const gender = document.getElementById('gender').value;
    const isSmoker = document.getElementById('smoking').value === 'Smoker';
    const deductible = parseInt(document.getElementById('deductible').value);

    let currentBalance = 0;
    const adminCharge = 60; // Flat recurring admin fee
    const resultsBody = document.getElementById('resultsBody');
    resultsBody.innerHTML = '';

    const maxAge = 99;
    const yearsToProject = Math.min(30, maxAge - entryAge + 1); // Up to 30 years or age 99

    // 2. Projection Loop
    for (let i = 0; i < yearsToProject; i++) {
        let age = entryAge + i;
        
        // Step A: Determine Allocation Rate (Front-end Loading)
        let allocationRate = 0.6;
        if (i >= 3) allocationRate = 0.8;
        if (i >= 6) allocationRate = 0.95;
        if (i >= 8) allocationRate = 1.0;

        let nettPremium = premium * allocationRate;
        
        // Step B: Look up Basic COI Rate
        let coiKey = gender + (isSmoker ? '_S' : '_NS');
        let coiRow = coiData.find(d => d.Age === age);
        let basicCOIRate = coiRow ? coiRow[coiKey] : 0;
        
        // Formula scale factor used in the original sheet
        let basicCOI = basicCOIRate * 5; 

        // Step C: Look up Medical Rider (MHSE)
        let mhseRow = mhseData.find(d => d.Age === age && d.Deductible === deductible);
        let mhseCost = 0;
        if (mhseRow) mhseCost = gender === 'Male' ? mhseRow.Male : mhseRow.Female;

        // Apply 40% N.NCD (No Claim Discount) mapped from Excel
        let actualMhseCost = mhseCost * 0.6; 

        // Step D: Calculate Ending Balance
        currentBalance += nettPremium;
        let totalDeductions = basicCOI + actualMhseCost + adminCharge;
        currentBalance -= totalDeductions;

        // Step E: Render Row
        const isLapsed = currentBalance < 0;
        const rowClass = isLapsed ? 'bg-red-50 text-red-600' : 'hover:bg-slate-50';
        
        const row = `<tr class="border-b border-slate-100 ${rowClass}">
            <td class="p-3 text-center">${age}</td>
            <td class="p-3 text-right text-emerald-600">+ ${nettPremium.toFixed(2)}</td>
            <td class="p-3 text-right text-rose-500">- ${basicCOI.toFixed(2)}</td>
            <td class="p-3 text-right text-rose-500">- ${actualMhseCost.toFixed(2)}</td>
            <td class="p-3 text-right font-bold ${isLapsed ? 'text-red-600' : 'text-slate-800'}">${currentBalance.toFixed(2)}</td>
        </tr>`;
        resultsBody.innerHTML += row;

        // Stop projection if policy lapses
        if (isLapsed) {
            resultsBody.innerHTML += `<tr><td colspan="5" class="p-4 text-center text-red-600 font-bold bg-red-100 rounded-b-lg">Policy Lapses at Age ${age}</td></tr>`;
            break;
        }
    }
}
