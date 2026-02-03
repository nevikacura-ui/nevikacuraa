/**
 * Thermal Printer Utility for Everycom EC58 (58mm Bluetooth)
 * Uses Web Bluetooth API for printing tokens
 */

// ESC/POS Commands
const ESC = 0x1B;
const GS = 0x1D;
const COMMANDS = {
  INIT: [ESC, 0x40],                    // Initialize printer
  ALIGN_CENTER: [ESC, 0x61, 0x01],      // Center alignment
  ALIGN_LEFT: [ESC, 0x61, 0x00],        // Left alignment
  BOLD_ON: [ESC, 0x45, 0x01],           // Bold on
  BOLD_OFF: [ESC, 0x45, 0x00],          // Bold off
  DOUBLE_HEIGHT: [GS, 0x21, 0x10],      // Double height
  DOUBLE_WIDTH: [GS, 0x21, 0x20],       // Double width
  DOUBLE_SIZE: [GS, 0x21, 0x30],        // Double height + width
  NORMAL_SIZE: [GS, 0x21, 0x00],        // Normal size
  UNDERLINE_ON: [ESC, 0x2D, 0x01],      // Underline on
  UNDERLINE_OFF: [ESC, 0x2D, 0x00],     // Underline off
  CUT_PAPER: [GS, 0x56, 0x00],          // Full cut
  FEED_LINES: (n) => [ESC, 0x64, n],    // Feed n lines
};

// Text encoder
const encoder = new TextEncoder();

class ThermalPrinter {
  constructor() {
    this.device = null;
    this.characteristic = null;
    this.isConnected = false;
    // Common Bluetooth printer service UUIDs
    this.SERVICE_UUIDS = [
      '000018f0-0000-1000-8000-00805f9b34fb',
      '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
    ];
    this.CHAR_UUIDS = [
      '00002af1-0000-1000-8000-00805f9b34fb',
      '49535343-8841-43f4-a8d4-ecbe34729bb3',
      'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f'
    ];
  }

  // Connect to Bluetooth printer (handles already paired devices)
  async connect() {
    try {
      // Request Bluetooth device with multiple filter options
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'EC58' },
          { namePrefix: 'Everycom' },
          { namePrefix: 'Printer' },
          { namePrefix: 'BlueTooth' },
          { namePrefix: 'BT' },
          { namePrefix: 'MPT' },
          { services: this.SERVICE_UUIDS }
        ],
        optionalServices: this.SERVICE_UUIDS
      });

      console.log('Device found:', this.device.name);

      // Handle disconnection
      this.device.addEventListener('gattserverdisconnected', () => {
        console.log('Printer disconnected');
        this.isConnected = false;
        this.characteristic = null;
      });

      // Connect to GATT server
      const server = await this.device.gatt.connect();
      console.log('Connected to GATT server');

      // Try to find a working service and characteristic
      let service = null;
      let characteristic = null;

      for (const serviceUuid of this.SERVICE_UUIDS) {
        try {
          service = await server.getPrimaryService(serviceUuid);
          console.log('Found service:', serviceUuid);
          
          for (const charUuid of this.CHAR_UUIDS) {
            try {
              characteristic = await service.getCharacteristic(charUuid);
              console.log('Found characteristic:', charUuid);
              break;
            } catch (e) {
              continue;
            }
          }
          
          if (characteristic) break;
          
          // If no known characteristic found, try to get all characteristics
          if (!characteristic) {
            const characteristics = await service.getCharacteristics();
            for (const char of characteristics) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                characteristic = char;
                console.log('Found writable characteristic:', char.uuid);
                break;
              }
            }
          }
          
          if (characteristic) break;
        } catch (e) {
          continue;
        }
      }

      if (!characteristic) {
        throw new Error('No writable characteristic found');
      }

      this.characteristic = characteristic;
      this.isConnected = true;
      return { success: true, deviceName: this.device.name };
    } catch (error) {
      console.error('Bluetooth connection error:', error);
      this.isConnected = false;
      return { success: false, error: error.message };
    }
  }

  // Reconnect to previously paired device
  async reconnect() {
    if (this.device && !this.device.gatt.connected) {
      try {
        const server = await this.device.gatt.connect();
        // Re-establish characteristic
        for (const serviceUuid of this.SERVICE_UUIDS) {
          try {
            const service = await server.getPrimaryService(serviceUuid);
            for (const charUuid of this.CHAR_UUIDS) {
              try {
                this.characteristic = await service.getCharacteristic(charUuid);
                this.isConnected = true;
                return { success: true };
              } catch (e) {
                continue;
              }
            }
          } catch (e) {
            continue;
          }
        }
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
    return { success: this.isConnected };
  }

  // Disconnect from printer
  async disconnect() {
    if (this.device && this.device.gatt.connected) {
      await this.device.gatt.disconnect();
    }
    this.isConnected = false;
    this.device = null;
    this.characteristic = null;
  }

  // Write data to printer in chunks (Bluetooth has packet size limits)
  async write(data) {
    if (!this.characteristic) {
      throw new Error('Printer not connected');
    }

    const CHUNK_SIZE = 100; // Safe chunk size for BLE
    const uint8Data = new Uint8Array(data);

    for (let i = 0; i < uint8Data.length; i += CHUNK_SIZE) {
      const chunk = uint8Data.slice(i, i + CHUNK_SIZE);
      await this.characteristic.writeValue(chunk);
      // Small delay between chunks
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // Print text with optional formatting
  async printText(text, options = {}) {
    const data = [];
    
    if (options.center) data.push(...COMMANDS.ALIGN_CENTER);
    if (options.bold) data.push(...COMMANDS.BOLD_ON);
    if (options.doubleSize) data.push(...COMMANDS.DOUBLE_SIZE);
    if (options.doubleHeight) data.push(...COMMANDS.DOUBLE_HEIGHT);
    if (options.doubleWidth) data.push(...COMMANDS.DOUBLE_WIDTH);
    
    data.push(...encoder.encode(text + '\n'));
    
    if (options.doubleSize || options.doubleHeight || options.doubleWidth) {
      data.push(...COMMANDS.NORMAL_SIZE);
    }
    if (options.bold) data.push(...COMMANDS.BOLD_OFF);
    if (options.center) data.push(...COMMANDS.ALIGN_LEFT);
    
    await this.write(data);
  }

  // Print separator line
  async printLine(char = '-', length = 32) {
    await this.printText(char.repeat(length));
  }

  // Print QR code (ESC/POS QR command)
  async printQRCode(data, size = 4) {
    const qrData = encoder.encode(data);
    const pL = (qrData.length + 3) % 256;
    const pH = Math.floor((qrData.length + 3) / 256);
    
    const commands = [
      // QR Code: Select model
      GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00,
      // QR Code: Set size
      GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size,
      // QR Code: Set error correction level
      GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31,
      // QR Code: Store data
      GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30,
      ...qrData,
      // QR Code: Print
      GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30,
    ];
    
    await this.write(commands);
  }

  // Feed paper
  async feed(lines = 3) {
    await this.write(COMMANDS.FEED_LINES(lines));
  }

  // Cut paper (if supported)
  async cut() {
    await this.write(COMMANDS.CUT_PAPER);
  }

  // Initialize printer
  async init() {
    await this.write(COMMANDS.INIT);
  }

  // Print complete token receipt
  async printToken(tokenData) {
    try {
      await this.init();
      
      // Header separator
      await this.printText('================================', { center: true });
      
      // Clinic name (large, bold, centered)
      const clinicName = tokenData.clinic?.replace(' Clinic', '').toUpperCase() || 'CLINIC';
      await this.printText(clinicName + ' CLINIC', { center: true, bold: true, doubleWidth: true });
      
      // Clinic address
      if (tokenData.clinic_address) {
        const shortAddress = tokenData.clinic_address.split(',')[0];
        await this.printText(shortAddress, { center: true });
      }
      
      await this.printText('================================', { center: true });
      await this.feed(1);
      
      // Token number (LARGEST - double size)
      await this.printText('TOKEN', { center: true, bold: true });
      await this.printText(String(tokenData.token_number || '0'), { center: true, bold: true, doubleSize: true });
      
      // Booking ID (smaller, below token)
      if (tokenData.booking_id) {
        await this.printText(tokenData.booking_id, { center: true });
      }
      
      await this.feed(1);
      
      // Appointment Type (Walk-in / Emergency / Scheduled)
      let appointmentType = 'SCHEDULED';
      if (tokenData.appointment_type === 'WALK_IN') {
        appointmentType = 'WALK-IN';
      } else if (tokenData.appointment_type === 'EMERGENCY') {
        appointmentType = 'EMERGENCY';
      } else if (tokenData.slot_time === 'Emergency' || !tokenData.slot_time) {
        appointmentType = 'EMERGENCY';
      }
      await this.printText('[ ' + appointmentType + ' ]', { center: true, bold: true });
      
      await this.printLine('-');
      
      // Patient name
      await this.printText('Patient:', { bold: true });
      await this.printText(tokenData.patient_name || 'Guest', { doubleHeight: true });
      
      // Slot time
      await this.printText('Time Slot: ' + (tokenData.slot_time || 'Walk-in'));
      
      // Date
      const dateStr = tokenData.date ? new Date(tokenData.date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }) : new Date().toLocaleDateString('en-IN');
      await this.printText('Date: ' + dateStr);
      
      await this.printLine('-');
      
      // Generated timestamp
      const now = new Date();
      const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      const genTime = istTime.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      await this.printText('Generated: ' + genTime, { center: true });
      
      await this.printLine('-');
      await this.feed(1);
      
      // Thank you message
      await this.printText('Thank you for choosing', { center: true });
      await this.printText('NEVIKA CURA', { center: true, bold: true });
      
      await this.feed(1);
      
      // QR Code for website
      await this.write(COMMANDS.ALIGN_CENTER);
      await this.printQRCode('https://nevikacura.com', 3);
      await this.write(COMMANDS.ALIGN_LEFT);
      
      await this.printText('nevikacura.com', { center: true });
      
      await this.printText('================================', { center: true });
      
      // Feed and cut
      await this.feed(4);
      
      return { success: true };
    } catch (error) {
      console.error('Print error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Singleton instance
const thermalPrinter = new ThermalPrinter();

export default thermalPrinter;
export { ThermalPrinter };
