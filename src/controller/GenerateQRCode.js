// @ts-nocheck
import QRCode from 'easyqrcodejs'
import qrLogo from '../images/MinerAirlinesCircularQRLogo.png';
/**
 * Will generate a QR code for the boarding pass. 
 * The QR code will contain the boarding pass URL, which can be used to access the boarding pass information
 * @param {string} passengerName 
 * @param {string} boardingPassURL 
 * @param {HTMLElement | null} targetElement
 */
export function generateQRCode(passengerName, boardingPassURL, targetElement) {
    if (!targetElement) {
        throw new Error('QR code target element was not found.');
    }

    const options_obeject ={
        text: boardingPassURL,
        width: 256,
        height: 256,
        colorDark : "#000000",
        colorLight : "#ffffff",
        logo: qrLogo,
        logoWidth: 60,
        logoHeight: 60,
        logoBackgroundTransparent: true,
        correctLevel : QRCode.CorrectLevel.H,
        title: passengerName + "'s - Boarding Pass", 
        titleFont: "normal normal bold 14px Arial", 
        titleColor: "#00084e", 
        titleBackgroundColor: "#fff", 
        titleHeight: 100, 
        titleTop: 12
    }
    return new QRCode(targetElement, options_obeject);
}