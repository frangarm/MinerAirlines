// @ts-nocheck
const SEAT_LETTERS = 'ABCDEFGHI';

function normalizeSeatCount(seatNum){
    const parsed = Number(seatNum);
    if(!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.floor(parsed);
}

function getLayout(seatNum){
    if(seatNum >= 180){
        return {
            seatsPerRow: 9,
            rows: ['left-row', 'middle-row', 'right-row'],
            split: [3, 3, 3]
        };
    }

    return {
        seatsPerRow: 4,
        rows: ['left-row', 'right-row'],
        split: [2, 2]
    };
}

function seatLabelFromIndex(index, seatsPerRow){
    const row = Math.floor(index / seatsPerRow) + 1;
    const letter = SEAT_LETTERS[index % seatsPerRow] || '';
    return `${row}${letter}`;
}

function balanceCounts(totalSeats, bucketCount){
    const counts = new Array(bucketCount).fill(Math.floor(totalSeats / bucketCount));
    let remainder = totalSeats % bucketCount;

    for(let i = 0; i < counts.length && remainder > 0; i++){
        counts[i] += 1;
        remainder -= 1;
    }

    return counts;
}

function clearRow(rowType){
    const row = document.querySelector(`.${rowType}`);
    if(!row) return;
    row.innerHTML = '';
}

/**
 * 
 * @param {any} seats 
 * @param {any} rowType 
 */
function appendSeats(seats, rowType, options){
    const row = document.querySelector(`.${rowType}`);
    if(!row) return;

    const {
        reservedSeatIds,
        seatsPerRow,
        nextSeatIndex
    } = options;

    for(let i = 0; i < seats; i++){
        const seatIndex = nextSeatIndex.value;
        const seatId = seatLabelFromIndex(seatIndex, seatsPerRow);
        const seat = document.createElement('div');
        seat.classList.add('seat');

        seat.dataset.seatId = seatId;
        seat.dataset.seatIndex = String(seatIndex);
        seat.setAttribute('title', seatId);

        if(reservedSeatIds.has(seatId)){
            seat.classList.add('reserved');
            seat.setAttribute('aria-disabled', 'true');
        }

        row.appendChild(seat);
        nextSeatIndex.value += 1;
    }

}

function selectSeats(maxSelectable, onSelectionChange){
    const seat = document.querySelectorAll('.seat');
    seat.forEach(s => {
        if(s.dataset.listenerBound === 'true') return;

        s.addEventListener('click', () => {
            if(s.classList.contains('reserved')) return;

            const selectedCount = document.querySelectorAll('.seat.selected').length;
            const isSelecting = !s.classList.contains('selected');
            if(isSelecting && selectedCount >= maxSelectable) return;

            s.classList.toggle('selected');

            if(typeof onSelectionChange === 'function'){
                onSelectionChange(getSelectedSeats());
            }
        });

        s.dataset.listenerBound = 'true';
    });
}

function getSelectedSeats(){
    return Array.from(document.querySelectorAll('.seat.selected'))
        .map((seat) => seat.dataset.seatId)
        .filter(Boolean);
}

/**
 * Renders seats with flight-style labels (1A, 1B, ...) and selection behavior.
 * @param {number} seatNum 
 * @param {{
 * reservedSeatIds?: string[],
 * maxSelectable?: number,
 * onSelectionChange?: (seatIds: string[]) => void
 * }} options
 * @returns {string[]} currently selected seats after rendering
 */
function setSeats(seatNum, options = {}){
    const totalSeats = normalizeSeatCount(seatNum);
    const { seatsPerRow, rows } = getLayout(totalSeats);

    const reservedSeatIds = new Set(
        (Array.isArray(options.reservedSeatIds) ? options.reservedSeatIds : [])
            .map((seatId) => String(seatId).trim().toUpperCase())
            .filter(Boolean)
    );

    const maxSelectable = Math.max(1, Number(options.maxSelectable) || Number.POSITIVE_INFINITY);

    ['left-row', 'middle-row', 'right-row'].forEach(clearRow);

    const counts = balanceCounts(totalSeats, rows.length);
    const seatCursor = { value: 0 };

    for(let i = 0; i < rows.length; i++){
        appendSeats(counts[i], rows[i], {
            reservedSeatIds,
            seatsPerRow,
            nextSeatIndex: seatCursor
        });
    }

    selectSeats(maxSelectable, options.onSelectionChange);
    return getSelectedSeats();
}

/**
 * Generates seat rows data structure
 * @param {number[]} seatingMap Array where 1 = reserved, 0 = available
 * @param {string[]} seatTierByIndex Tier name for each seat index
 * @param {number} seatsPerRow Seats per row (4 or 9)
 * @returns {Array} Array of rows with structure: { rowNumber, groups, rowTier }
 */
function generateSeatRows(seatingMap, seatTierByIndex, seatsPerRow) {
    const rows = [];
    const seatsPerGroup = seatsPerRow === 9 ? 3 : 2;
    const groupsPerRow = seatsPerRow === 9 ? 3 : 2;

    for (let i = 0; i < seatingMap.length; i += seatsPerRow) {
        const chunk = seatingMap.slice(i, i + seatsPerRow);
        const rowNumber = Math.floor(i / seatsPerRow) + 1;

        const groups = Array.from({ length: groupsPerRow }, (_, groupIndex) => {
            const startIndex = groupIndex * seatsPerGroup;
            const groupChunk = chunk.slice(startIndex, startIndex + seatsPerGroup);

            return groupChunk.map((status, seatOffset) => {
                const absoluteSeatIndex = startIndex + seatOffset;
                const mapIndex = i + absoluteSeatIndex;
                return {
                    id: seatLabelFromIndex(mapIndex, seatsPerRow),
                    available: status === 0,
                    tier: seatTierByIndex[mapIndex] || 'Economy',
                };
            });
        });

        const rowTier = seatTierByIndex[i] || 'Economy';
        rows.push({ rowNumber, groups, rowTier });
    }

    return rows;
}

export { setSeats, getSelectedSeats, generateSeatRows };
