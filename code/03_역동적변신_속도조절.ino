// ========================================
// 03. 역동적 변신 (속도 조절 = 부드럽게!)
// ========================================
// 서보를 1도씩 조금씩 움직여 "스르륵~" 부드러운 변신
// 속도를 다르게 주면 "빨랐다 느렸다" 역동적인 느낌!
//
// 배선: 02번과 동일 (서보1=P13, 서보2=P12)
// ========================================

#include <ESP32Servo.h>

Servo servo1;
Servo servo2;

// 서보를 천천히 움직이는 함수
// from각도 -> to각도 까지 1도씩 이동 (speed 작을수록 빠름)
void slowMove(Servo &s, int from, int to, int speed) {
  if (from < to) {
    for (int a = from; a <= to; a++) { s.write(a); delay(speed); }
  } else {
    for (int a = from; a >= to; a--) { s.write(a); delay(speed); }
  }
}

void setup() {
  servo1.attach(13);
  servo2.attach(12);
  servo1.write(0);
  servo2.write(0);
  delay(1000);
}

void loop() {
  // ===== 역동적 변신 (속도 섞기) =====
  slowMove(servo1, 0, 180, 10);    // 천천히 펴기
  slowMove(servo2, 0, 90, 5);      // 조금 빠르게
  slowMove(servo2, 90, 180, 15);   // 느리게 마무리
  delay(1500);                     // 로봇 완성!

  // ===== 다시 접기 =====
  slowMove(servo2, 180, 0, 8);
  slowMove(servo1, 180, 0, 8);
  delay(1500);
}
