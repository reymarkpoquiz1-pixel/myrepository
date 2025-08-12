<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';

class CryptoService {
    private string $key;

    public function __construct(?string $key = null) {
        $k = $key ?? app_key();
        if ($k === '' || strlen($k) < 32) {
            throw new RuntimeException('APP_KEY must be a 32-byte key (use base64: prefix).');
        }
        $this->key = substr($k, 0, 32);
    }

    public function encryptString(string $plaintext): string {
        $iv = random_bytes(16);
        $ciphertext = openssl_encrypt($plaintext, 'aes-256-cbc', $this->key, OPENSSL_RAW_DATA, $iv);
        if ($ciphertext === false) {
            throw new RuntimeException('Encryption failed');
        }
        return base64_encode($iv . $ciphertext);
    }

    public function decryptString(string $encoded): string {
        $data = base64_decode($encoded, true);
        if ($data === false || strlen($data) < 17) {
            throw new RuntimeException('Invalid encrypted data');
        }
        $iv = substr($data, 0, 16);
        $ciphertext = substr($data, 16);
        $plaintext = openssl_decrypt($ciphertext, 'aes-256-cbc', $this->key, OPENSSL_RAW_DATA, $iv);
        if ($plaintext === false) {
            throw new RuntimeException('Decryption failed');
        }
        return $plaintext;
    }

    public function encryptFile(string $sourcePath, string $destPath): array {
        $iv = random_bytes(16);
        $in = fopen($sourcePath, 'rb');
        $out = fopen($destPath, 'wb');
        if (!$in || !$out) {
            throw new RuntimeException('Unable to open files for encryption');
        }
        fwrite($out, $iv);
        $cipher = 'aes-256-cbc';
        $blockSize = 16 * 1024;
        while (!feof($in)) {
            $plaintext = fread($in, $blockSize);
            if ($plaintext === false) break;
            $ciphertext = openssl_encrypt($plaintext, $cipher, $this->key, OPENSSL_RAW_DATA | OPENSSL_ZERO_PADDING, $iv);
            if ($ciphertext === false) {
                fclose($in); fclose($out);
                throw new RuntimeException('File encryption failed');
            }
            fwrite($out, $ciphertext);
            $iv = substr($ciphertext, -16);
        }
        fclose($in); fclose($out);
        return ['iv' => base64_encode($iv)];
    }

    public function decryptFile(string $sourcePath, string $destPath): void {
        $in = fopen($sourcePath, 'rb');
        $out = fopen($destPath, 'wb');
        if (!$in || !$out) {
            throw new RuntimeException('Unable to open files for decryption');
        }
        $iv = fread($in, 16);
        $cipher = 'aes-256-cbc';
        $blockSize = 16 * 1024;
        while (!feof($in)) {
            $ciphertext = fread($in, $blockSize);
            if ($ciphertext === false || $ciphertext === '') break;
            $plaintext = openssl_decrypt($ciphertext, $cipher, $this->key, OPENSSL_RAW_DATA | OPENSSL_ZERO_PADDING, $iv);
            if ($plaintext === false) {
                fclose($in); fclose($out);
                throw new RuntimeException('File decryption failed');
            }
            fwrite($out, rtrim($plaintext, "\0"));
            $iv = substr($ciphertext, -16);
        }
        fclose($in); fclose($out);
    }
}