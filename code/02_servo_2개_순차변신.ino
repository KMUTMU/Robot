// ========================================
// 02. 서보 2개 순차 변신 (변신의 심장!)
// ========================================
// 서보 2개를 "순서대로" 움직여 변신 동작 흉내
//
// 배선:
//   서보1 주황 -> ESP32 P13 / 빨강 -> 빵판 +레일 / 갈색 -> 빵판 -레일
//   서보2 주황 -> ESP32 P12 / 빨강 -> 빵판 +레일 / 갈색 -> 빵판 -레일
//   (전원: ESP32 5V -> 빵판 +레일, ESP32 GND -> 빵판 -레일)
// ========================================

#include <ESP32Servo.h>

Servo servo1;   // P13
Servo servo2;   // P12

void setup() {
  servo1.attach(13);
  servo2.attach(12);

  // 시작 자세 (자동차 모드)
  servo1.write(0);
  servo2.write(0);
  delay(1000);
}

void loop() {
  // ===== 변신 시작 (순서대로) =====
  servo1.write(90);    delay(800);
  servo2.write(90);    delay(800);
  servo1.write(180);   delay(800);
  servo2.write(180);   delay(1500);   // 로봇 모드 완성!

  // ===== 다시 접기 (자동차로) =====
  servo2.write(0);     delay(800);
  servo1.write(0);     delay(1500);   // 자동차 모드 완성!
}
