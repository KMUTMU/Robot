// ========================================
// 05. 블루투스 역동적 변신 (확확 움직임!) ✅ 성공
// ========================================
// 밋밋함 탈출! 역동성의 3비결 적용:
//   1) 동시 동작 (moveBoth) - 여러 서보 함께 확!
//   2) 빠른 속도 (speed=2)  - 확! 튀어나옴
//   3) 반동/오버슈트 (snapTo) - 목표보다 더 갔다 돌아옴
//
// 핸드폰: '1'=변신, '0'=복귀 (Serial Bluetooth Terminal 앱)
// 배선: 서보1=P13, 서보2=P12
// ========================================

#include <ESP32Servo.h>
#include "BluetoothSerial.h"

BluetoothSerial SerialBT;
Servo servo1;
Servo servo2;

void slowMove(Servo &s, int from, int to, int speed) {
  if (from < to) for (int a=from; a<=to; a++){ s.write(a); delay(speed); }
  else           for (int a=from; a>=to; a--){ s.write(a); delay(speed); }
}

// 두 서보를 "동시에" (역동성 핵심!)
void moveBoth(int s1from, int s1to, int s2from, int s2to, int speed) {
  int steps = 60;
  for (int i = 0; i <= steps; i++) {
    servo1.write(s1from + (s1to - s1from) * i / steps);
    servo2.write(s2from + (s2to - s2from) * i / steps);
    delay(speed);
  }
}

// 반동 효과 (살짝 넘었다 돌아옴 = 생동감)
void snapTo(Servo &s, int from, int to) {
  int over = to + (to > from ? 15 : -15);
  slowMove(s, from, over, 2);
  slowMove(s, over, to, 12);
}

void transformToRobot() {
  SerialBT.println(">> 변신 시작!");
  moveBoth(0, 100, 0, 80, 2);
  delay(100);
  snapTo(servo1, 100, 180);
  delay(80);
  snapTo(servo2, 80, 180);
  servo1.write(170); servo2.write(170); delay(70);
  servo1.write(180); servo2.write(180);
  SerialBT.println(">> 로봇 모드 완성!");
}

void transformToCar() {
  SerialBT.println(">> 자동차로 복귀!");
  moveBoth(180, 90, 180, 90, 2);
  delay(100);
  snapTo(servo1, 90, 0);
  snapTo(servo2, 90, 0);
  SerialBT.println(">> 자동차 모드 완성!");
}

void setup() {
  SerialBT.begin("Robot_Bumblebee");
  servo1.attach(13);
  servo2.attach(12);
  servo1.write(0);
  servo2.write(0);
  delay(1000);
  SerialBT.println("준비 완료! '1'=변신, '0'=복귀");
}

void loop() {
  if (SerialBT.available()) {
    char cmd = SerialBT.read();
    if (cmd == '1') transformToRobot();
    else if (cmd == '0') transformToCar();
  }
}
