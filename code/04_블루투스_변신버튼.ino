// ========================================
// 04. 블루투스 변신 버튼 (핸드폰으로 자동 변신!)
// ========================================
// 핸드폰 블루투스 앱에서 글자를 보내면 변신!
//   '1' 보내면 -> 로봇 모드로 변신
//   '0' 보내면 -> 자동차 모드로 복귀
//
// 배선: 03번과 동일 (서보1=P13, 서보2=P12)
//
// [핸드폰 앱]
//   안드로이드: "Serial Bluetooth Terminal" 앱 설치 (무료)
//   1) ESP32 전원 켜기
//   2) 핸드폰 블루투스 설정에서 "Robot_Bumblebee" 페어링
//   3) 앱 열고 연결 -> 글자 '1' 또는 '0' 전송
//
// ⚠️ 아이폰은 클래식 블루투스(SPP)를 지원 안 해서 이 방식이 안 돼요.
//    아이폰이면 알려주세요 -> BLE 또는 WiFi 방식으로 바꿔드릴게요.
// ========================================

#include <ESP32Servo.h>
#include "BluetoothSerial.h"

BluetoothSerial SerialBT;
Servo servo1;
Servo servo2;

// 서보를 부드럽게 움직이는 함수
void slowMove(Servo &s, int from, int to, int speed) {
  if (from < to) {
    for (int a = from; a <= to; a++) { s.write(a); delay(speed); }
  } else {
    for (int a = from; a >= to; a--) { s.write(a); delay(speed); }
  }
}

// 로봇 모드로 변신
void transformToRobot() {
  SerialBT.println("변신! 로봇 모드로...");
  slowMove(servo1, 0, 180, 10);
  slowMove(servo2, 0, 90, 5);
  slowMove(servo2, 90, 180, 15);
  SerialBT.println("로봇 모드 완성!");
}

// 자동차 모드로 복귀
void transformToCar() {
  SerialBT.println("자동차 모드로 복귀...");
  slowMove(servo2, 180, 0, 8);
  slowMove(servo1, 180, 0, 8);
  SerialBT.println("자동차 모드 완성!");
}

void setup() {
  SerialBT.begin("Robot_Bumblebee");   // 블루투스 이름
  servo1.attach(13);
  servo2.attach(12);

  // 시작은 자동차 모드
  servo1.write(0);
  servo2.write(0);
  delay(1000);

  SerialBT.println("준비 완료! '1'=변신, '0'=복귀");
}

void loop() {
  // 핸드폰에서 글자가 오면 읽기
  if (SerialBT.available()) {
    char cmd = SerialBT.read();

    if (cmd == '1') {
      transformToRobot();      // 로봇으로 변신
    } else if (cmd == '0') {
      transformToCar();        // 자동차로 복귀
    }
  }
}
