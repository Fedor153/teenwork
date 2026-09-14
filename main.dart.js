import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'firebase_options.dart';
import 'dart:async';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  runApp(const TeenWorkApp());
}

class AppColors {
  static const Color primary = Color(0xFF1E3A8A);
  static const Color primaryLight = Color(0xFF3B5CB8);
  static const Color accent = Color(0xFF10B981);
  static const Color background = Color(0xFFF5F7FA);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color textPrimary = Color(0xFF1F2937);
  static const Color textSecondary = Color(0xFF6B7280);
  static const Color warning = Color(0xFFF59E0B);
  static const Color danger = Color(0xFFEF4444);
  static const Color divider = Color(0xFFE5E7EB);
}

class TeenWorkApp extends StatelessWidget {
  const TeenWorkApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TeenWork',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primary,
          primary: AppColors.primary,
          secondary: AppColors.accent,
          surface: AppColors.surface,
        ),
        scaffoldBackgroundColor: AppColors.background,
        useMaterial3: true,
      ),
      home: StreamBuilder<User?>(
        stream: FirebaseAuth.instance.authStateChanges(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const SplashScreen();
          }
          if (snapshot.hasData) {
            return const MainScreen();
          }
          return const LoginScreen();
        },
      ),
    );
  }
}

class AIService {
  static String detectCategory(String text) {
    final lower = text.toLowerCase();

    final Map<String, List<String>> keywords = {
      'Тексты': ['напиши', 'текст', 'пост', 'статья', 'сочинение', 'описание', 'рерайт'],
      'Дизайн': ['дизайн', 'canva', 'обложка', 'баннер', 'логотип', 'картинка', 'мем'],
      'Соцсети': ['instagram', 'telegram', 'подписчик', 'блог', 'аккаунт', 'хэштег'],
      'Монтаж': ['видео', 'монтаж', 'tiktok', 'ролик', 'youtube', 'нарезка'],
      'Учёба': ['урок', 'математика', 'физика', 'химия', 'задача', 'объясни', 'конспект'],
      'Переводы': ['переведи', 'перевод', 'английский', 'язык', 'translate'],
      'Творчество': ['озвучка', 'бит', 'мелодия', 'идея', 'сценарий'],
    };

    for (final entry in keywords.entries) {
      for (final keyword in entry.value) {
        if (lower.contains(keyword)) {
          return entry.key;
        }
      }
    }
    return 'Тексты';
  }

  static String detectChatTopic(List<String> messages) {
    if (messages.isEmpty) return 'Общее';

    final allText = messages.join(' ').toLowerCase();

    if (allText.contains('цена') ||
        allText.contains('руб') ||
        allText.contains('стоит') ||
        allText.contains('деньги') ||
        allText.contains('оплат')) {
      return 'Оплата';
    }
    if (allText.contains('когда') ||
        allText.contains('срок') ||
        allText.contains('завтра') ||
        allText.contains('сегодня') ||
        allText.contains('дедлайн')) {
      return 'Сроки';
    }
    if (allText.contains('вопрос') ||
        allText.contains('помоги') ||
        allText.contains('не понимаю') ||
        allText.contains('объясни')) {
      return 'Вопросы';
    }
    if (allText.contains('спасибо') ||
        allText.contains('отлично') ||
        allText.contains('хорошо')) {
      return 'Завершён';
    }
    return 'Общее';
  }

  static Map<String, dynamic> scanForPersonalData(String text) {
    final results = <String, dynamic>{
      'hasPhone': false,
      'hasEmail': false,
      'hasAddress': false,
      'hasPassport': false,
      'warnings': <String>[],
    };

    final phoneRegex = RegExp(
      r'(\+7|8)[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}',
    );
    if (phoneRegex.hasMatch(text)) {
      results['hasPhone'] = true;
      results['warnings'].add('Обнаружен номер телефона. Не передавайте его в чате!');
    }

    final emailRegex = RegExp(
      r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}',
    );
    if (emailRegex.hasMatch(text)) {
      results['hasEmail'] = true;
      results['warnings'].add('Обнаружен email. Не передавайте его в чате!');
    }

    final addressRegex = RegExp(
      r'(ул\.\s|улица\s|пр\.\s|проспект\s|д\.\s*\d|дом\s*\d|кв\.\s*\d|квартира\s*\d|г\.\s|город\s|пос\.\s|поселок\s)',
    );
    if (addressRegex.hasMatch(text)) {
      results['hasAddress'] = true;
      results['warnings'].add('Обнаружен адрес. Не передавайте его в чате!');
    }

    final passportRegex = RegExp(
      r'(паспорт|серия\s*\d{4}|номер\s*\d{6}|\d{4}\s?\d{6})',
      caseSensitive: false,
    );
    if (passportRegex.hasMatch(text)) {
      results['hasPassport'] = true;
      results['warnings'].add('Обнаружены паспортные данные. Не передавайте их в чате!');
    }

    return results;
  }
}

class IdGenerator {
  static int _counter = 0;
  static String generate() {
    _counter++;
    return '${DateTime.now().millisecondsSinceEpoch}_$_counter';
  }
}

class TaskService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Stream<List<Task>> watchTasks() {
    return _firestore
        .collection('tasks')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
          return snapshot.docs.map((doc) {
            final data = doc.data();
            final responses = (data['responses'] as List? ?? [])
                .map((r) => Response(
                      id: r['id'] ?? '',
                      taskId: doc.id,
                      executorName: r['executorName'] ?? '',
                      executorId: r['executorId'] ?? '',
                      status: r['status'] ?? 'pending',
                      createdAt: DateTime.tryParse(r['createdAt'] ?? '') ??
                          DateTime.now(),
                    ))
                .toList();

            return Task(
              id: doc.id,
              title: data['title'] ?? '',
              categories: List<String>.from(data['categories'] ?? []),
              priceValue: data['priceValue'] ?? 0,
              description: data['description'] ?? '',
              deadline: data['deadline'] ?? 'Не указан',
              author: data['author'] ?? 'Неизвестный',
              authorId: data['authorId'] ?? '',
              rating: (data['rating'] ?? 0.0).toDouble(),
              responses: responses,
            );
          }).toList();
        });
  }

  Future<void> addTask(Task task) async {
    await _firestore.collection('tasks').add({
      'title': task.title,
      'categories': task.categories,
      'priceValue': task.priceValue,
      'description': task.description,
      'deadline': task.deadline,
      'author': task.author,
      'authorId': task.authorId,
      'rating': task.rating,
      'responses': [],
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> addResponse(String taskId, Response response) async {
    final docRef = _firestore.collection('tasks').doc(taskId);
    await docRef.update({
      'responses': FieldValue.arrayUnion([
        {
          'id': response.id,
          'taskId': response.taskId,
          'executorName': response.executorName,
          'executorId': response.executorId,
          'status': response.status,
          'createdAt': response.createdAt.toIso8601String(),
        }
      ]),
    });
  }

  Future<void> updateResponseStatus(
      String taskId, String responseId, String status) async {
    final docRef = _firestore.collection('tasks').doc(taskId);
    final doc = await docRef.get();
    final data = doc.data();
    if (data == null) return;

    final responses = List<Map<String, dynamic>>.from(data['responses'] ?? []);
    final updatedResponses = responses.map((r) {
      if (r['id'] == responseId) {
        r['status'] = status;
      }
      return r;
    }).toList();

    await docRef.update({'responses': updatedResponses});
  }
}

class ChatService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  /// Единая логика определения имени собеседника.
  /// Порядок:
  ///   1) participantNames[interlocutorId]  — актуальный формат;
  ///   2) interlocutorName на верхнем уровне — legacy-чаты;
  ///   3) 'Пользователь' — заглушка.
  /// Пустые строки и пробелы игнорируются.
  String _resolveInterlocutorName(
    Map<String, dynamic> data,
    String interlocutorId,
  ) {
    final names = Map<String, dynamic>.from(data['participantNames'] ?? {});
    final fromMap = names[interlocutorId]?.toString();
    if (fromMap != null && fromMap.trim().isNotEmpty) {
      return fromMap.trim();
    }

    final legacy = data['interlocutorName']?.toString();
    if (legacy != null && legacy.trim().isNotEmpty) {
      return legacy.trim();
    }

    return 'Пользователь';
  }

  Stream<List<Chat>> watchChats() {
    final userId = _auth.currentUser?.uid;
    if (userId == null) return Stream.value([]);

    return _firestore
        .collection('chats')
        .where('participants', arrayContains: userId)
        .orderBy('lastUpdated', descending: true)
        .snapshots()
        .map((snapshot) {
          return snapshot.docs.map((doc) {
            final data = doc.data();
            final messages = (data['messages'] as List? ?? [])
                .map((m) => ChatMessage(
                      id: m['id'] ?? '',
                      text: m['text'] ?? '',
                      isMe: m['senderId'] == userId,
                      time: DateTime.tryParse(m['time'] ?? '') ?? DateTime.now(),
                      hasPersonalData: m['hasPersonalData'] ?? false,
                    ))
                .toList();

            final interlocutorId = (data['participants'] as List? ?? [])
                .firstWhere((id) => id != userId, orElse: () => '');

            final displayName =
                _resolveInterlocutorName(data, interlocutorId);

            final topic = AIService.detectChatTopic(
                messages.map((m) => m.text).toList());

            return Chat(
              id: doc.id,
              interlocutor: displayName,
              interlocutorId: interlocutorId,
              messages: messages,
              lastUpdated:
                  (data['lastUpdated'] as Timestamp?)?.toDate() ?? DateTime.now(),
              topic: topic,
            );
          }).toList();
        });
  }

  /// Возвращает существующий чат с [interlocutorId] или создаёт новый.
  /// Имена обеих сторон сохраняются в participantNames: {uid: name}.
  Future<Chat> getOrCreateChat(
      String interlocutorId, String interlocutorName) async {
    final userId = _auth.currentUser?.uid;
    if (userId == null) throw Exception('Пользователь не авторизован');

    final myName = _auth.currentUser?.displayName ?? 'Пользователь';

    final existing = await _firestore
        .collection('chats')
        .where('participants', arrayContains: userId)
        .get();

    for (final doc in existing.docs) {
      final data = doc.data();
      final participants = List<String>.from(data['participants'] ?? []);
      if (participants.contains(interlocutorId) &&
          participants.contains(userId)) {
        final messages = (data['messages'] as List? ?? [])
            .map((m) => ChatMessage(
                  id: m['id'] ?? '',
                  text: m['text'] ?? '',
                  isMe: m['senderId'] == userId,
                  time: DateTime.tryParse(m['time'] ?? '') ?? DateTime.now(),
                  hasPersonalData: m['hasPersonalData'] ?? false,
                ))
            .toList();

        final displayName =
            _resolveInterlocutorName(data, interlocutorId);

        final topic =
            AIService.detectChatTopic(messages.map((m) => m.text).toList());

        return Chat(
          id: doc.id,
          interlocutor: displayName,
          interlocutorId: interlocutorId,
          messages: messages,
          lastUpdated:
              (data['lastUpdated'] as Timestamp?)?.toDate() ?? DateTime.now(),
          topic: topic,
        );
      }
    }

    final docRef = await _firestore.collection('chats').add({
      'participants': [userId, interlocutorId],
      'participantNames': {
        userId: myName,
        interlocutorId: interlocutorName,
      },
      'messages': [],
      'lastUpdated': FieldValue.serverTimestamp(),
      'createdAt': FieldValue.serverTimestamp(),
    });

    return Chat(
      id: docRef.id,
      interlocutor: interlocutorName,
      interlocutorId: interlocutorId,
      messages: [],
      lastUpdated: DateTime.now(),
      topic: 'Общее',
    );
  }

  Stream<Chat> watchChat(String chatId) {
    return _firestore.collection('chats').doc(chatId).snapshots().map((doc) {
      final data = doc.data();
      if (data == null) throw Exception('Чат не найден');

      final userId = _auth.currentUser?.uid ?? '';
      final messages = (data['messages'] as List? ?? [])
          .map((m) => ChatMessage(
                id: m['id'] ?? '',
                text: m['text'] ?? '',
                isMe: m['senderId'] == userId,
                time: DateTime.tryParse(m['time'] ?? '') ?? DateTime.now(),
                hasPersonalData: m['hasPersonalData'] ?? false,
              ))
          .toList();

      final interlocutorId = (data['participants'] as List? ?? [])
          .firstWhere((id) => id != userId, orElse: () => '');

      final displayName = _resolveInterlocutorName(data, interlocutorId);

      final topic =
          AIService.detectChatTopic(messages.map((m) => m.text).toList());

      return Chat(
        id: doc.id,
        interlocutor: displayName,
        interlocutorId: interlocutorId,
        messages: messages,
        lastUpdated:
            (data['lastUpdated'] as Timestamp?)?.toDate() ?? DateTime.now(),
        topic: topic,
      );
    });
  }

  Future<void> sendMessage(String chatId, String text) async {
    final userId = _auth.currentUser?.uid;
    if (userId == null) return;

    final scanResult = AIService.scanForPersonalData(text);

    final message = {
      'id': IdGenerator.generate(),
      'text': text,
      'senderId': userId,
      'time': DateTime.now().toIso8601String(),
      'hasPersonalData': scanResult['warnings'].isNotEmpty,
    };

    await _firestore.collection('chats').doc(chatId).update({
      'messages': FieldValue.arrayUnion([message]),
      'lastUpdated': FieldValue.serverTimestamp(),
    });
  }
}

class Task {
  final String id;
  final String title;
  final List<String> categories;
  final int priceValue;
  final String description;
  final String deadline;
  final String author;
  final String authorId;
  final double rating;
  final List<Response> responses;

  Task({
    required this.id,
    required this.title,
    required this.categories,
    required this.priceValue,
    required this.description,
    required this.deadline,
    required this.author,
    required this.authorId,
    this.rating = 0.0,
    this.responses = const [],
  });

  String get priceDisplay => '$priceValue ₽';

  bool matchesInterests(List<String> interests) {
    if (interests.isEmpty) return true;
    final taskSet = categories.map((c) => c.trim().toLowerCase()).toSet();
    final interestSet = interests.map((i) => i.trim().toLowerCase()).toSet();
    return taskSet.intersection(interestSet).isNotEmpty;
  }

  bool matchesCategory(String category) {
    if (category == 'Все') return true;
    return categories.contains(category);
  }
}

class Response {
  final String id;
  final String taskId;
  final String executorName;
  final String executorId;
  final String status;
  final DateTime createdAt;

  Response({
    required this.id,
    required this.taskId,
    required this.executorName,
    required this.executorId,
    required this.status,
    required this.createdAt,
  });

  Response copyWith({String? status}) {
    return Response(
      id: id,
      taskId: taskId,
      executorName: executorName,
      executorId: executorId,
      status: status ?? this.status,
      createdAt: createdAt,
    );
  }
}

class ChatMessage {
  final String id;
  final String text;
  final bool isMe;
  final DateTime time;
  final bool hasPersonalData;

  ChatMessage({
    required this.id,
    required this.text,
    required this.isMe,
    required this.time,
    this.hasPersonalData = false,
  });
}

class Chat {
  final String id;
  final String interlocutor;
  final String interlocutorId;
  final List<ChatMessage> messages;
  final DateTime lastUpdated;
  final String topic;

  Chat({
    required this.id,
    required this.interlocutor,
    required this.interlocutorId,
    this.messages = const [],
    required this.lastUpdated,
    this.topic = 'Общее',
  });
}

final Map<String, List<String>> categoryGroups = {
  'Тексты': [
    'Написание текстов',
    'Рерайт статей',
    'Придумать слоган',
    'Написание отзывов'
  ],
  'Работа с данными': [
    'Составление списков',
    'Транскрибация аудио',
    'Расшифровка субтитров',
    'Сбор информации в таблицу',
    'Заполнение Excel'
  ],
  'Дизайн': [
    'Дизайн в Canva',
    'Оформление обложек',
    'Подбор стоковых фото',
    'Создание мемов',
    'Обработка фото'
  ],
  'Соцсети': [
    'Посты для соцсетей',
    'Ответы на комментарии',
    'Подбор хэштегов',
    'Мониторинг конкурентов',
    'Модерация чата'
  ],
  'Техническое': [
    'Разметка данных для ИИ',
    'Тестирование сайтов',
    'Прохождение опросов',
    'Оценка интерфейса',
    'Проверка ссылок'
  ],
  'Учёба': [
    'Помощь с уроками',
    'Проверка ДЗ',
    'Составление конспектов',
    'Подготовка карточек'
  ],
  'Переводы': ['Перевод текстов', 'Проверка перевода'],
  'Творчество': [
    'Озвучка текста',
    'Написание битов',
    'Идеи для видео',
    'Форматирование документа',
    'Проверка орфографии'
  ],
};

final List<String> allCategories =
    categoryGroups.values.expand((e) => e).toList();
final List<String> categoryGroupNames = categoryGroups.keys.toList();

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );

    _scaleAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutBack),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeIn),
    );

    _controller.forward();

    Future.delayed(const Duration(seconds: 2, milliseconds: 500), () {
      if (!mounted) return;
      if (FirebaseAuth.instance.currentUser != null) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const MainScreen()),
        );
      } else {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const LoginScreen()),
        );
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppColors.primary,
              AppColors.primaryLight,
              AppColors.primary,
            ],
          ),
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AnimatedBuilder(
                animation: _controller,
                builder: (context, child) {
                  return Transform.scale(
                    scale: _scaleAnimation.value,
                    child: Opacity(
                      opacity: _fadeAnimation.value,
                      child: Container(
                        padding: const EdgeInsets.all(30),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.work,
                          size: 80,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 30),
              AnimatedBuilder(
                animation: _controller,
                builder: (context, child) {
                  return Opacity(
                    opacity: _fadeAnimation.value,
                    child: const Text(
                      'TeenWork',
                      style: TextStyle(
                        fontSize: 42,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        letterSpacing: 2,
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 10),
              AnimatedBuilder(
                animation: _controller,
                builder: (context, child) {
                  return Opacity(
                    opacity: _fadeAnimation.value,
                    child: Text(
                      'Работа для подростков',
                      style: TextStyle(
                        fontSize: 16,
                        color: Colors.white.withValues(alpha: 0.8),
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 50),
              AnimatedBuilder(
                animation: _controller,
                builder: (context, child) {
                  return Opacity(
                    opacity: _fadeAnimation.value,
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        DotAnimation(delay: 0),
                        DotAnimation(delay: 300),
                        DotAnimation(delay: 600),
                      ],
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class DotAnimation extends StatefulWidget {
  final int delay;
  const DotAnimation({super.key, required this.delay});

  @override
  State<DotAnimation> createState() => _DotAnimationState();
}

class _DotAnimationState extends State<DotAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 900),
      vsync: this,
    )..repeat(reverse: true);
    _animation = Tween<double>(begin: 0.3, end: 1.0).animate(_controller);

    Future.delayed(Duration(milliseconds: widget.delay), () {
      if (mounted) _controller.forward();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 6),
          width: 12 * _animation.value,
          height: 12 * _animation.value,
          decoration: const BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
          ),
        );
      },
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _nameController = TextEditingController();
  bool _isLogin = true;
  bool _isLoading = false;

  Future<void> _auth() async {
    setState(() => _isLoading = true);
    try {
      if (_isLogin) {
        await FirebaseAuth.instance.signInWithEmailAndPassword(
          email: _emailController.text.trim(),
          password: _passwordController.text.trim(),
        );
      } else {
        UserCredential userCredential = await FirebaseAuth.instance
            .createUserWithEmailAndPassword(
          email: _emailController.text.trim(),
          password: _passwordController.text.trim(),
        );
        await userCredential.user!
            .updateDisplayName(_nameController.text.trim());
        await FirebaseFirestore.instance
            .collection('users')
            .doc(userCredential.user!.uid)
            .set({
          'name': _nameController.text.trim(),
          'email': _emailController.text.trim(),
          'interests': [],
          'rating': 0.0,
          'completedTasks': 0,
          'termsAccepted': false,
          'createdAt': FieldValue.serverTimestamp(),
        });
      }
      if (!mounted) return;
    } on FirebaseAuthException catch (e) {
      String message = 'Ошибка входа';
      if (e.code == 'user-not-found') message = 'Пользователь не найден';
      if (e.code == 'wrong-password') message = 'Неверный пароль';
      if (e.code == 'email-already-in-use') message = 'Эта почта уже используется';
      if (e.code == 'weak-password') message = 'Слабый пароль';
      if (e.code == 'invalid-email') message = 'Неверный формат почты';
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message), backgroundColor: AppColors.danger),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Произошла ошибка'),
            backgroundColor: AppColors.danger),
      );
    }
    if (mounted) setState(() => _isLoading = false);
  }

  /// Восстановление пароля по email через Firebase.
  /// Firebase пришлёт письмо со ссылкой для сброса пароля
  /// на почту, указанную при регистрации.
  Future<void> _resetPassword() async {
    final email = _emailController.text.trim();

    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Введите email, указанный при регистрации'),
          backgroundColor: AppColors.warning,
        ),
      );
      return;
    }

    final emailRegex = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
    if (!emailRegex.hasMatch(email)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Неверный формат email'),
          backgroundColor: AppColors.warning,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      await FirebaseAuth.instance.sendPasswordResetEmail(email: email);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Письмо для восстановления пароля отправлено на $email. '
            'Проверьте почту (и папку «Спам»).',
          ),
          backgroundColor: AppColors.accent,
          duration: const Duration(seconds: 5),
        ),
      );
    } on FirebaseAuthException catch (e) {
      String message = 'Не удалось отправить письмо';
      if (e.code == 'user-not-found') {
        message = 'Пользователь с таким email не найден';
      } else if (e.code == 'invalid-email') {
        message = 'Неверный формат email';
      } else if (e.code == 'too-many-requests') {
        message = 'Слишком много попыток. Попробуйте позже';
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message), backgroundColor: AppColors.danger),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Не удалось отправить письмо. Проверьте соединение'),
          backgroundColor: AppColors.danger,
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Card(
              elevation: 8,
              color: AppColors.surface,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20)),
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.work,
                        size: 60, color: AppColors.primary),
                    const SizedBox(height: 8),
                    const Text(
                      'TeenWork',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(height: 24),
                    if (!_isLogin)
                      TextField(
                        controller: _nameController,
                        decoration: const InputDecoration(
                          labelText: 'Имя',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.person),
                        ),
                      ),
                    if (!_isLogin) const SizedBox(height: 12),
                    TextField(
                      controller: _emailController,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.email),
                      ),
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _passwordController,
                      decoration: const InputDecoration(
                        labelText: 'Пароль',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.lock),
                      ),
                      obscureText: true,
                    ),
                    if (_isLogin)
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton.icon(
                          onPressed: _isLoading ? null : _resetPassword,
                          icon: const Icon(Icons.lock_reset, size: 18),
                          label: const Text('Забыли пароль?'),
                          style: TextButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                          ),
                        ),
                      ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _auth,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                              )
                            : Text(_isLogin ? 'Войти' : 'Зарегистрироваться'),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: () => setState(() => _isLogin = !_isLogin),
                      child: Text(
                        _isLogin
                            ? 'Нет аккаунта? Зарегистрируйтесь'
                            : 'Уже есть аккаунт? Войдите',
                        style: const TextStyle(color: AppColors.primary),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class TermsScreen extends StatefulWidget {
  final VoidCallback onAccepted;
  const TermsScreen({super.key, required this.onAccepted});

  @override
  State<TermsScreen> createState() => _TermsScreenState();
}

class _TermsScreenState extends State<TermsScreen> {
  final List<bool> _checks = [false, false, false, false, false];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              const SizedBox(height: 20),
              const Icon(Icons.work, size: 60, color: AppColors.primary),
              const SizedBox(height: 8),
              const Text(
                'Правила TeenWork',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Пожалуйста, внимательно прочитайте правила',
                style:
                    TextStyle(fontSize: 14, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 20),
              Card(
                elevation: 4,
                color: AppColors.surface,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _buildRuleItem(
                        index: 0,
                        title: 'Регистрация',
                        desc:
                            'Я подтверждаю, что ввожу реальные данные при регистрации.',
                      ),
                      _buildDivider(),
                      _buildRuleItem(
                        index: 1,
                        title: 'Честность',
                        desc:
                            'Я обязуюсь выполнять работу качественно и в срок. Заказчик обязуется оплатить работу после выполнения.',
                      ),
                      _buildDivider(),
                      _buildRuleItem(
                        index: 2,
                        title: 'Безопасность',
                        desc:
                            'Я не передаю личные данные (адрес, паспорт, банковские карты) другим пользователям.',
                      ),
                      _buildDivider(),
                      _buildRuleItem(
                        index: 3,
                        title: 'Оплата',
                        desc:
                            'Аванс 20% — до начала работы. Остаток 80% — после выполнения. Я согласен с этой системой.',
                      ),
                      _buildDivider(),
                      _buildRuleItem(
                        index: 4,
                        title: 'ОТВЕТСТВЕННОСТЬ',
                        desc:
                            'Я принимаю, что TeenWork является площадкой для поиска работы и не несёт ответственности за качество выполнения заказов, а также за любые споры и конфликты между пользователями. Все претензии решаются между заказчиком и исполнителем напрямую.',
                        isImportant: true,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed:
                      _checks.every((c) => c) ? widget.onAccepted : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _checks.every((c) => c)
                        ? AppColors.primary
                        : AppColors.divider,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    _checks.every((c) => c)
                        ? 'Принимаю и продолжаю'
                        : 'Прочитайте и примите все пункты',
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Нажимая "Принимаю", вы соглашаетесь со всеми правилами',
                style:
                    TextStyle(fontSize: 12, color: AppColors.textSecondary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRuleItem({
    required int index,
    required String title,
    required String desc,
    bool isImportant = false,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Checkbox(
          value: _checks[index],
          onChanged: (value) {
            setState(() {
              _checks[index] = value ?? false;
            });
          },
          activeColor: AppColors.primary,
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontWeight:
                        isImportant ? FontWeight.bold : FontWeight.w600,
                    fontSize: isImportant ? 16 : 14,
                    color: isImportant
                        ? AppColors.danger
                        : AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  desc,
                  style: TextStyle(
                    fontSize: 13,
                    color: isImportant
                        ? AppColors.danger
                        : AppColors.textSecondary,
                    height: 1.4,
                    fontWeight:
                        isImportant ? FontWeight.w500 : FontWeight.normal,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDivider() {
    return const Divider(height: 4, thickness: 1);
  }
}

class ProfileScreen extends StatelessWidget {
  final List<String> interests;
  final VoidCallback? onEditInterests;
  final String name;
  final String email;
  final double rating;
  final int completedTasks;

  const ProfileScreen({
    super.key,
    required this.interests,
    this.onEditInterests,
    required this.name,
    required this.email,
    required this.rating,
    required this.completedTasks,
  });

  Future<void> _logout(BuildContext context) async {
    await FirebaseAuth.instance.signOut();
    if (!context.mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => const LoginScreen()),
    );
  }

  String _getInitials(String name) {
    if (name.isEmpty) return '?';
    return name[0].toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Мой профиль'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => _logout(context),
            tooltip: 'Выйти',
          ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircleAvatar(
                radius: 50,
                backgroundColor: AppColors.primary,
                child: Text(
                  _getInitials(name),
                  style: const TextStyle(fontSize: 36, color: Colors.white),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                name,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                email,
                style: const TextStyle(
                    fontSize: 14, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.star, color: AppColors.warning),
                  const SizedBox(width: 4),
                  Text(
                    rating.toStringAsFixed(1),
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.accent.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '$completedTasks заданий',
                      style: const TextStyle(
                        color: AppColors.accent,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.divider),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Интересы',
                            style: TextStyle(
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary)),
                        TextButton.icon(
                          onPressed: onEditInterests ?? () {},
                          icon: const Icon(Icons.edit, size: 16),
                          label: const Text('Изменить'),
                          style: TextButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            minimumSize: const Size(0, 30),
                            padding:
                                const EdgeInsets.symmetric(horizontal: 8),
                          ),
                        ),
                      ],
                    ),
                    if (interests.isEmpty)
                      const Text(
                        'Не выбраны',
                        style: TextStyle(color: AppColors.textSecondary),
                      )
                    else
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: interests.map((i) {
                          return Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color:
                                  AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(i,
                                style: const TextStyle(
                                    color: AppColors.primary, fontSize: 12)),
                          );
                        }).toList(),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const MyResponsesScreen(),
                      ),
                    );
                  },
                  icon: const Icon(Icons.list_alt),
                  label: const Text('Мои отклики'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Чат с поддержкой'),
                        backgroundColor: AppColors.primary,
                      ),
                    );
                  },
                  icon: const Icon(Icons.support_agent),
                  label: const Text('Поддержка'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class MyResponsesScreen extends StatefulWidget {
  const MyResponsesScreen({super.key});

  @override
  State<MyResponsesScreen> createState() => _MyResponsesScreenState();
}

class _MyResponsesScreenState extends State<MyResponsesScreen> {
  final TaskService _taskService = TaskService();
  final ChatService _chatService = ChatService();
  StreamSubscription<List<Task>>? _subscription;
  List<Map<String, dynamic>> _myResponses = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadResponses();
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  void _loadResponses() {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    _subscription?.cancel();

    _subscription = _taskService.watchTasks().listen(
      (tasks) {
        final userId = FirebaseAuth.instance.currentUser?.uid;
        if (userId == null) return;

        final myResponses = <Map<String, dynamic>>[];
        for (final task in tasks) {
          for (final response in task.responses) {
            if (response.executorId == userId) {
              myResponses.add({
                'task': task,
                'response': response,
              });
            }
          }
        }

        if (mounted) {
          setState(() {
            _myResponses = myResponses;
            _isLoading = false;
          });
        }
      },
      onError: (e) {
        if (!mounted) return;
        setState(() {
          _error = 'Не удалось загрузить отклики. Проверьте соединение.';
          _isLoading = false;
        });
      },
    );
  }

  String _getStatusText(String status) {
    switch (status) {
      case 'pending':
        return 'Ожидает ответа';
      case 'accepted':
        return 'Принят';
      case 'rejected':
        return 'Отклонён';
      default:
        return status;
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending':
        return AppColors.warning;
      case 'accepted':
        return AppColors.accent;
      case 'rejected':
        return AppColors.danger;
      default:
        return AppColors.textSecondary;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'pending':
        return Icons.hourglass_top;
      case 'accepted':
        return Icons.check_circle;
      case 'rejected':
        return Icons.cancel;
      default:
        return Icons.info;
    }
  }

  Future<void> _openChatWithAuthor(Task task) async {
    if (task.authorId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Автор задания недоступен для чата'),
          backgroundColor: AppColors.warning,
        ),
      );
      return;
    }
    try {
      final chat =
          await _chatService.getOrCreateChat(task.authorId, task.author);
      if (!mounted) return;
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ChatDetailScreen(chatId: chat.id),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Ошибка открытия чата: $e'),
          backgroundColor: AppColors.danger,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Мои отклики'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.cloud_off,
                            size: 64, color: AppColors.textSecondary),
                        const SizedBox(height: 16),
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 16,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _loadResponses,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Повторить'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              : _myResponses.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.inbox,
                              size: 64, color: Colors.grey[400]),
                          const SizedBox(height: 16),
                          const Text(
                            'Вы ещё не откликнулись на задания',
                            style: TextStyle(
                              fontSize: 16,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Найдите интересное задание на главной',
                            style: TextStyle(
                              fontSize: 14,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _myResponses.length,
                      itemBuilder: (context, index) {
                        final item = _myResponses[index];
                        final Task task = item['task'];
                        final Response response = item['response'];

                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          color: AppColors.surface,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          elevation: 2,
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        task.title,
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                    ),
                                    Text(
                                      task.priceDisplay,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.accent,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Icon(
                                      _getStatusIcon(response.status),
                                      size: 18,
                                      color:
                                          _getStatusColor(response.status),
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      _getStatusText(response.status),
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color:
                                            _getStatusColor(response.status),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    const Icon(Icons.person,
                                        size: 14,
                                        color: AppColors.textSecondary),
                                    const SizedBox(width: 4),
                                    Expanded(
                                      child: Text(
                                        'Автор: ${task.author}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: AppColors.textSecondary,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                SizedBox(
                                  width: double.infinity,
                                  child: OutlinedButton.icon(
                                    onPressed: () =>
                                        _openChatWithAuthor(task),
                                    icon: const Icon(Icons.chat, size: 18),
                                    label: const Text('Написать автору'),
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: AppColors.primary,
                                      side: const BorderSide(
                                          color: AppColors.primary),
                                      padding: const EdgeInsets.symmetric(
                                          vertical: 12),
                                      shape: RoundedRectangleBorder(
                                        borderRadius:
                                            BorderRadius.circular(12),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}

class ChatsScreen extends StatefulWidget {
  final List<Chat> chats;

  const ChatsScreen({super.key, required this.chats});

  @override
  State<ChatsScreen> createState() => _ChatsScreenState();
}

class _ChatsScreenState extends State<ChatsScreen> {
  bool _grouped = false;

  String _getInitials(String name) {
    if (name.isEmpty) return '?';
    return name[0].toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    if (_grouped) {
      final groupedChats = <String, List<Chat>>{};
      for (final chat in widget.chats) {
        groupedChats.putIfAbsent(chat.topic, () => []).add(chat);
      }
      final sortedTopics = groupedChats.keys.toList()..sort();

      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: const Text('Чаты (по темам)'),
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          actions: [
            IconButton(
              icon: const Icon(Icons.list),
              onPressed: () => setState(() => _grouped = false),
              tooltip: 'Плоский список',
            ),
          ],
        ),
        body: widget.chats.isEmpty
            ? _buildEmptyState()
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: sortedTopics.length,
                itemBuilder: (context, topicIndex) {
                  final topic = sortedTopics[topicIndex];
                  final topicChats = groupedChats[topic]!;
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(top: 12, bottom: 8),
                        child: Text(
                          '$topic (${topicChats.length})',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      ...topicChats.map((chat) => _buildChatTile(chat)),
                    ],
                  );
                },
              ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Чаты'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.sort),
            onPressed: () => setState(() => _grouped = true),
            tooltip: 'Сгруппировать по темам (ИИ)',
          ),
        ],
      ),
      body: widget.chats.isEmpty
          ? _buildEmptyState()
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: widget.chats.length,
              itemBuilder: (context, index) {
                return _buildChatTile(widget.chats[index]);
              },
            ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.chat_bubble_outline,
              size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          const Text(
            'Здесь будут ваши чаты',
            style: TextStyle(
              fontSize: 18,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Откликнитесь на задание, чтобы начать общение',
            style: TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChatTile(Chat chat) {
    final lastMessage = chat.messages.isNotEmpty
        ? chat.messages.last.text
        : 'Нет сообщений';
    final hasPersonalData = chat.messages.any((m) => m.hasPersonalData);

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
      leading: CircleAvatar(
        backgroundColor: hasPersonalData
            ? AppColors.danger.withValues(alpha: 0.1)
            : AppColors.primary.withValues(alpha: 0.1),
        child: Text(
          _getInitials(chat.interlocutor),
          style: TextStyle(
            color: hasPersonalData ? AppColors.danger : AppColors.primary,
          ),
        ),
      ),
      title: Row(
        children: [
          Expanded(
            child: Text(
              chat.interlocutor,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
          ),
          if (hasPersonalData)
            const Icon(Icons.warning_amber,
                color: AppColors.danger, size: 16),
        ],
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(lastMessage, maxLines: 1, overflow: TextOverflow.ellipsis),
          if (hasPersonalData)
            const Text(
              'Есть подозрение на личные данные',
              style: TextStyle(
                fontSize: 10,
                color: AppColors.danger,
                fontWeight: FontWeight.w600,
              ),
            ),
        ],
      ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            _formatTime(chat.lastUpdated),
            style: const TextStyle(
                color: AppColors.textSecondary, fontSize: 12),
          ),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              chat.topic,
              style: const TextStyle(
                fontSize: 10,
                color: AppColors.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ChatDetailScreen(chatId: chat.id),
          ),
        );
      },
    );
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);
    if (diff.inDays == 0) {
      return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
    } else if (diff.inDays == 1) {
      return 'Вчера';
    } else if (diff.inDays < 7) {
      return '${diff.inDays} дн.';
    } else {
      return '${time.day}.${time.month}';
    }
  }
}

class ChatDetailScreen extends StatefulWidget {
  final String chatId;

  const ChatDetailScreen({super.key, required this.chatId});

  @override
  State<ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends State<ChatDetailScreen> {
  final TextEditingController _controller = TextEditingController();
  final ChatService _chatService = ChatService();
  late Stream<Chat> _chatStream;

  @override
  void initState() {
    super.initState();
    _chatStream = _chatService.watchChat(widget.chatId);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    final scanResult = AIService.scanForPersonalData(text);

    if (scanResult['warnings'].isNotEmpty) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Внимание!'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Обнаружены подозрительные данные в сообщении:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                scanResult['warnings'].join('\n'),
                style: const TextStyle(color: AppColors.danger),
              ),
              const SizedBox(height: 12),
              const Text(
                'Мы не рекомендуем передавать личные данные в чате. Это может быть небезопасно.',
                style: TextStyle(fontSize: 13),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Отменить'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                _sendMessageForce(text);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.danger,
                foregroundColor: Colors.white,
              ),
              child: const Text('Отправить всё равно'),
            ),
          ],
        ),
      );
      return;
    }

    await _chatService.sendMessage(widget.chatId, text);
    _controller.clear();
  }

  Future<void> _sendMessageForce(String text) async {
    await _chatService.sendMessage(widget.chatId, text);
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: StreamBuilder<Chat>(
          stream: _chatStream,
          builder: (context, snapshot) {
            if (snapshot.hasData) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(snapshot.data!.interlocutor),
                  Text(
                    'Тема: ${snapshot.data!.topic}',
                    style: const TextStyle(
                        fontSize: 10, color: Colors.white70),
                  ),
                ],
              );
            }
            return const Text('Чат');
          },
        ),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Expanded(
            child: StreamBuilder<Chat>(
              stream: _chatStream,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Center(child: Text('Ошибка: ${snapshot.error}'));
                }
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }

                final chat = snapshot.data!;
                final messages = chat.messages;

                if (messages.isEmpty) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.chat_bubble_outline,
                            size: 48, color: AppColors.textSecondary),
                        SizedBox(height: 16),
                        Text('Нет сообщений. Напишите что-нибудь!'),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  reverse: true,
                  padding: const EdgeInsets.all(16),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final msg = messages[messages.length - 1 - index];
                    return _buildMessageBubble(msg);
                  },
                );
              },
            ),
          ),
          _buildMessageInput(),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(ChatMessage msg) {
    final isMe = msg.isMe;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment:
            isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          Container(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.75,
            ),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: msg.hasPersonalData
                  ? AppColors.danger.withValues(alpha: 0.15)
                  : isMe
                      ? AppColors.primary
                      : AppColors.surface,
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(16),
                topRight: const Radius.circular(16),
                bottomLeft: isMe
                    ? const Radius.circular(16)
                    : const Radius.circular(4),
                bottomRight: isMe
                    ? const Radius.circular(4)
                    : const Radius.circular(16),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  msg.text,
                  style: TextStyle(
                    color: msg.hasPersonalData
                        ? AppColors.danger
                        : isMe
                            ? Colors.white
                            : AppColors.textPrimary,
                  ),
                ),
                if (msg.hasPersonalData)
                  const Padding(
                    padding: EdgeInsets.only(top: 4),
                    child: Text(
                      'Личные данные',
                      style: TextStyle(
                        fontSize: 10,
                        color: AppColors.danger,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                const SizedBox(height: 4),
                Text(
                  _formatTime(msg.time),
                  style: TextStyle(
                    fontSize: 10,
                    color: isMe
                        ? Colors.white70
                        : AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageInput() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.divider)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _controller,
              decoration: InputDecoration(
                hintText: 'Напишите сообщение...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: AppColors.background,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16),
              ),
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          const SizedBox(width: 8),
          CircleAvatar(
            backgroundColor: AppColors.primary,
            child: IconButton(
              icon: const Icon(Icons.send, color: Colors.white, size: 20),
              onPressed: _sendMessage,
            ),
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);
    if (diff.inDays == 0) {
      return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
    } else if (diff.inDays == 1) {
      return 'Вчера';
    } else {
      return '${time.day}.${time.month} ${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
    }
  }
}

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  final TaskService _taskService = TaskService();
  final ChatService _chatService = ChatService();
  int _selectedIndex = 0;
  String selectedCategory = 'Все';
  String _searchQuery = '';
  List<String> _selectedFilterCategories = [];
  Timer? _debounceTimer;
  List<Task> _tasks = [];
  List<Chat> _chats = [];
  bool _termsAccepted = false;
  bool _isLoading = true;
  List<String> _userInterests = [];
  double _userRating = 0.0;
  int _userCompletedTasks = 0;

  StreamSubscription<List<Task>>? _tasksSubscription;
  StreamSubscription<List<Chat>>? _chatsSubscription;

  User? get _currentUser => FirebaseAuth.instance.currentUser;

  @override
  void initState() {
    super.initState();
    _checkTerms();
    _loadTasks();
    _loadChats();
    _loadUserProfile();
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _tasksSubscription?.cancel();
    _chatsSubscription?.cancel();
    super.dispose();
  }

  void _loadUserProfile() async {
    final user = _currentUser;
    if (user == null) return;
    try {
      final doc = await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .get();
      if (doc.exists && mounted) {
        final data = doc.data()!;
        setState(() {
          _userInterests = List<String>.from(data['interests'] ?? []);
          _userRating = (data['rating'] ?? 0.0).toDouble();
          _userCompletedTasks = data['completedTasks'] ?? 0;
        });
      }
    } catch (e) {
      debugPrint('Ошибка загрузки профиля: $e');
    }
  }

  void _checkTerms() async {
    final user = _currentUser;
    if (user != null) {
      try {
        final doc = await FirebaseFirestore.instance
            .collection('users')
            .doc(user.uid)
            .get();
        if (doc.exists && doc.data()?['termsAccepted'] == true) {
          if (mounted) setState(() => _termsAccepted = true);
        } else {
          if (mounted) _showTermsDialog();
        }
      } catch (e) {
        if (mounted) _showTermsDialog();
      }
    }
    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  void _showTermsDialog() {
    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Dialog(
        insetPadding: const EdgeInsets.all(16),
        child: TermsScreen(
          onAccepted: () async {
            final user = _currentUser;
            if (user != null) {
              await FirebaseFirestore.instance
                  .collection('users')
                  .doc(user.uid)
                  .update({'termsAccepted': true});
              if (mounted) setState(() => _termsAccepted = true);
            }
            if (!mounted) return;
            Navigator.pop(context);
          },
        ),
      ),
    );
  }

  void _loadTasks() {
    _tasksSubscription = _taskService.watchTasks().listen(
      (tasks) {
        if (mounted) {
          setState(() => _tasks = tasks);
        }
      },
      onError: (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Не удалось загрузить задания'),
              backgroundColor: AppColors.danger,
            ),
          );
        }
      },
    );
  }

  void _loadChats() {
    _chatsSubscription = _chatService.watchChats().listen(
      (chats) {
        if (mounted) {
          setState(() => _chats = chats);
        }
      },
      onError: (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Не удалось загрузить чаты'),
              backgroundColor: AppColors.danger,
            ),
          );
        }
      },
    );
  }

  List<Task> get _filteredTasks {
    return _tasks.where((task) {
      final matchesSearch = _searchQuery.isEmpty ||
          task.title.toLowerCase().contains(_searchQuery.toLowerCase());

      bool matchesCategory = true;
      if (selectedCategory != 'Все') {
        final groupCategories = categoryGroups[selectedCategory] ?? [];
        matchesCategory =
            task.categories.any((c) => groupCategories.contains(c));
      }

      final matchesFilter = _selectedFilterCategories.isEmpty ||
          task.categories.any((c) => _selectedFilterCategories.contains(c));

      return matchesSearch && matchesCategory && matchesFilter;
    }).toList();
  }

  List<Task> get _recommendedTasks {
    if (_userInterests.isEmpty) return <Task>[];

    return _tasks.where((task) {
      final matchesSearch = _searchQuery.isEmpty ||
          task.title.toLowerCase().contains(_searchQuery.toLowerCase());

      final matchesCategory =
          selectedCategory == 'Все' || task.matchesCategory(selectedCategory);

      final matchesInterests = task.matchesInterests(_userInterests);

      return matchesSearch && matchesCategory && matchesInterests;
    }).toList();
  }

  void _onSearchChanged(String value) {
    setState(() => _searchQuery = value);
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      if (mounted) setState(() {});
    });
  }

  Future<void> _applyForTask(Task task) async {
    final user = _currentUser;
    if (user == null) return;

    if (task.authorId == user.uid) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Это ваше задание'),
            backgroundColor: AppColors.warning),
      );
      return;
    }

    if (task.responses.any((r) => r.executorId == user.uid)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Вы уже откликнулись'),
            backgroundColor: AppColors.warning),
      );
      return;
    }

    final response = Response(
      id: IdGenerator.generate(),
      taskId: task.id,
      executorName: user.displayName ?? 'Пользователь',
      executorId: user.uid,
      status: 'pending',
      createdAt: DateTime.now(),
    );

    await _taskService.addResponse(task.id, response);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Отклик отправлен! Ждите ответа от ${task.author}'),
        backgroundColor: AppColors.accent,
      ),
    );
  }

  Future<void> _openChatWithUser(String uid, String name) async {
    if (uid.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Нет данных пользователя для чата'),
          backgroundColor: AppColors.warning,
        ),
      );
      return;
    }
    try {
      final chat = await _chatService.getOrCreateChat(uid, name);
      if (!mounted) return;
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ChatDetailScreen(chatId: chat.id),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Ошибка открытия чата: $e'),
          backgroundColor: AppColors.danger,
        ),
      );
    }
  }

  Future<void> _openChat(Task task) async {
    await _openChatWithUser(task.authorId, task.author);
  }

  String _statusText(String status) {
    switch (status) {
      case 'pending':
        return 'Ожидает';
      case 'accepted':
        return 'Принят';
      case 'rejected':
        return 'Отклонён';
      default:
        return status;
    }
  }

  void _viewResponses(Task task) {
    if (task.responses.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Нет откликов')),
      );
      return;
    }

    final freshTask =
        _tasks.firstWhere((t) => t.id == task.id, orElse: () => task);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Отклики на "${freshTask.title}"'),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView.builder(
            shrinkWrap: true,
            itemCount: freshTask.responses.length,
            itemBuilder: (context, index) {
              final response = freshTask.responses[index];
              return ListTile(
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                leading: CircleAvatar(
                  backgroundColor: response.status == 'accepted'
                      ? AppColors.accent
                      : response.status == 'rejected'
                          ? AppColors.danger
                          : AppColors.warning,
                  child: Text(
                    response.executorName.isNotEmpty
                        ? response.executorName[0].toUpperCase()
                        : '?',
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
                title: Text(response.executorName),
                subtitle: Text(_statusText(response.status)),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      tooltip: 'Написать исполнителю',
                      icon: const Icon(Icons.chat,
                          color: AppColors.primary),
                      onPressed: () {
                        Navigator.pop(context);
                        _openChatWithUser(
                          response.executorId,
                          response.executorName,
                        );
                      },
                    ),
                    if (response.status == 'pending') ...[
                      IconButton(
                        tooltip: 'Принять',
                        icon: const Icon(Icons.check,
                            color: AppColors.accent),
                        onPressed: () async {
                          await _taskService.updateResponseStatus(
                            freshTask.id,
                            response.id,
                            'accepted',
                          );
                          if (!mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                  'Исполнитель ${response.executorName} принят'),
                              backgroundColor: AppColors.accent,
                            ),
                          );
                          Navigator.pop(context);
                        },
                      ),
                      IconButton(
                        tooltip: 'Отклонить',
                        icon: const Icon(Icons.close,
                            color: AppColors.danger),
                        onPressed: () async {
                          await _taskService.updateResponseStatus(
                            freshTask.id,
                            response.id,
                            'rejected',
                          );
                          if (!mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                  'Исполнитель ${response.executorName} отклонён'),
                              backgroundColor: AppColors.danger,
                            ),
                          );
                          Navigator.pop(context);
                        },
                      ),
                    ],
                  ],
                ),
              );
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Закрыть'),
          ),
        ],
      ),
    );
  }

  void _showInterestsDialog() {
    Set<String> tempSelected = Set.from(_userInterests);
    String selectedGroup = categoryGroupNames.first;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setStateDialog) {
          return AlertDialog(
            title: const Text('Выберите ваши интересы'),
            content: SizedBox(
              width: double.maxFinite,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<String>(
                    value: selectedGroup,
                    items: categoryGroupNames.map((group) {
                      return DropdownMenuItem(
                          value: group, child: Text(group));
                    }).toList(),
                    onChanged: (value) =>
                        setStateDialog(() => selectedGroup = value!),
                    decoration: const InputDecoration(
                      labelText: 'Группа категорий',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: categoryGroups[selectedGroup]!.map((cat) {
                      final isSelected = tempSelected.contains(cat);
                      return FilterChip(
                        label: Text(cat),
                        selected: isSelected,
                        onSelected: (selected) {
                          setStateDialog(() {
                            if (selected) {
                              tempSelected.add(cat);
                            } else {
                              tempSelected.remove(cat);
                            }
                          });
                        },
                        selectedColor:
                            AppColors.primary.withValues(alpha: 0.3),
                        backgroundColor: AppColors.background,
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Отмена'),
              ),
              ElevatedButton(
                onPressed: () async {
                  final user = _currentUser;
                  if (user == null) return;
                  await FirebaseFirestore.instance
                      .collection('users')
                      .doc(user.uid)
                      .update({'interests': tempSelected.toList()});
                  if (!mounted) return;
                  setState(() {
                    _userInterests = tempSelected.toList();
                  });
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Интересы сохранены!'),
                      backgroundColor: AppColors.accent,
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                ),
                child: Text('Сохранить (${tempSelected.length})'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showAddTaskDialog() {
    final titleController = TextEditingController();
    final priceController = TextEditingController();
    final descController = TextEditingController();
    final deadlineController = TextEditingController();
    Set<String> selectedCategories = {};
    String selectedGroup = categoryGroupNames.first;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setStateDialog) {
          return AlertDialog(
            title: const Text('Новое задание'),
            content: SizedBox(
              width: double.maxFinite,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    DropdownButtonFormField<String>(
                      value: selectedGroup,
                      items: categoryGroupNames.map((group) {
                        return DropdownMenuItem(
                            value: group, child: Text(group));
                      }).toList(),
                      onChanged: (value) {
                        setStateDialog(() {
                          selectedGroup = value!;
                        });
                      },
                      decoration: const InputDecoration(
                        labelText: 'Группа категорий',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: categoryGroups[selectedGroup]!.map((cat) {
                        final isSelected = selectedCategories.contains(cat);
                        return FilterChip(
                          label: Text(cat),
                          selected: isSelected,
                          onSelected: (selected) {
                            setStateDialog(() {
                              if (selected) {
                                selectedCategories.add(cat);
                              } else {
                                selectedCategories.remove(cat);
                              }
                            });
                          },
                          selectedColor:
                              AppColors.primary.withValues(alpha: 0.3),
                          backgroundColor: AppColors.background,
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: titleController,
                      decoration: const InputDecoration(
                          labelText: 'Название задания *'),
                      keyboardType: TextInputType.text,
                    ),
                    TextField(
                      controller: priceController,
                      decoration: const InputDecoration(
                        labelText: 'Цена *',
                        hintText: 'Например: 500',
                      ),
                      keyboardType: TextInputType.number,
                    ),
                    TextField(
                      controller: descController,
                      decoration:
                          const InputDecoration(labelText: 'Описание'),
                      maxLines: 3,
                    ),
                    TextField(
                      controller: deadlineController,
                      decoration:
                          const InputDecoration(labelText: 'Срок выполнения'),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Отмена',
                    style: TextStyle(color: AppColors.textSecondary)),
              ),
              ElevatedButton(
                onPressed: () async {
                  if (titleController.text.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text('Введите название задания')),
                    );
                    return;
                  }
                  if (priceController.text.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Введите цену')),
                    );
                    return;
                  }
                  final price = int.tryParse(priceController.text);
                  if (price == null || price <= 0) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text(
                              'Введите корректную цену (положительное число)')),
                    );
                    return;
                  }

                  final user = _currentUser;
                  if (user == null) return;

                  bool aiHelped = false;
                  if (selectedCategories.isEmpty) {
                    final detectedCategory =
                        AIService.detectCategory(titleController.text);
                    selectedCategories.add(detectedCategory);
                    aiHelped = true;
                  }

                  await _taskService.addTask(
                    Task(
                      id: IdGenerator.generate(),
                      title: titleController.text,
                      categories: selectedCategories.toList(),
                      priceValue: price,
                      description: descController.text,
                      deadline: deadlineController.text.isNotEmpty
                          ? deadlineController.text
                          : 'Не указан',
                      author: user.displayName ?? 'Пользователь',
                      authorId: user.uid,
                      rating: 5.0,
                    ),
                  );
                  if (!mounted) return;
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        aiHelped
                            ? 'Задание опубликовано (ИИ помог с категорией: ${selectedCategories.first})'
                            : 'Задание опубликовано',
                      ),
                      backgroundColor: AppColors.accent,
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Опубликовать'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showFilterDialog() {
    Set<String> tempSelected = Set.from(_selectedFilterCategories);
    String selectedGroup = categoryGroupNames.first;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setStateDialog) {
          return AlertDialog(
            title: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Фильтр'),
                TextButton(
                  onPressed: () {
                    setStateDialog(() {
                      tempSelected.clear();
                    });
                  },
                  child: const Text('Сбросить',
                      style: TextStyle(color: AppColors.danger)),
                ),
              ],
            ),
            content: SizedBox(
              width: double.maxFinite,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<String>(
                    value: selectedGroup,
                    items: categoryGroupNames.map((group) {
                      return DropdownMenuItem(
                          value: group, child: Text(group));
                    }).toList(),
                    onChanged: (value) {
                      setStateDialog(() {
                        selectedGroup = value!;
                      });
                    },
                    decoration: const InputDecoration(
                      labelText: 'Группа категорий',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: categoryGroups[selectedGroup]!.map((cat) {
                      final isSelected = tempSelected.contains(cat);
                      return FilterChip(
                        label: Text(cat),
                        selected: isSelected,
                        onSelected: (selected) {
                          setStateDialog(() {
                            if (selected) {
                              tempSelected.add(cat);
                            } else {
                              tempSelected.remove(cat);
                            }
                          });
                        },
                        selectedColor:
                            AppColors.primary.withValues(alpha: 0.3),
                        backgroundColor: AppColors.background,
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Отмена'),
              ),
              ElevatedButton(
                onPressed: () {
                  setState(() {
                    _selectedFilterCategories = tempSelected.toList();
                  });
                  Navigator.pop(context);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                ),
                child: Text('Применить (${tempSelected.length})'),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final bool showMain = _selectedIndex == 0;
    final bool showChats = _selectedIndex == 1;
    final bool showRecommendations = _selectedIndex == 2;
    final bool showProfile = _selectedIndex == 3;

    final List<Task> tasks = showMain
        ? _filteredTasks
        : showRecommendations
            ? _recommendedTasks
            : <Task>[];

    final bool showCategoryChips = showMain || showRecommendations;
    final bool showSearch = showMain || showRecommendations;
    final bool showFilter = showMain;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('TeenWork'),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        bottom: showSearch
            ? PreferredSize(
                preferredSize: const Size.fromHeight(48),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    children: [
                      Expanded(
                        child: Container(
                          height: 40,
                          decoration: BoxDecoration(
                            color: AppColors.background,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: TextField(
                            onChanged: _onSearchChanged,
                            decoration: const InputDecoration(
                              hintText: 'Поиск по заданиям...',
                              prefixIcon: Icon(Icons.search,
                                  size: 20,
                                  color: AppColors.textSecondary),
                              border: InputBorder.none,
                              contentPadding:
                                  EdgeInsets.symmetric(vertical: 8),
                            ),
                          ),
                        ),
                      ),
                      if (showFilter) const SizedBox(width: 8),
                      if (showFilter)
                        Container(
                          height: 40,
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: IconButton(
                            icon: const Icon(Icons.filter_list,
                                color: Colors.white, size: 20),
                            onPressed: _showFilterDialog,
                          ),
                        ),
                    ],
                  ),
                ),
              )
            : null,
      ),
      body: showProfile
          ? ProfileScreen(
              interests: _userInterests,
              onEditInterests: _showInterestsDialog,
              name: _currentUser?.displayName ?? 'Пользователь',
              email: _currentUser?.email ?? 'Не указан',
              rating: _userRating,
              completedTasks: _userCompletedTasks,
            )
          : showChats
              ? ChatsScreen(chats: _chats)
              : (showMain || showRecommendations)
                  ? Column(
                      children: [
                        if (showCategoryChips)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 8),
                            height: 50,
                            child: ListView(
                              scrollDirection: Axis.horizontal,
                              children: [
                                _buildCategoryChip('Все'),
                                ...categoryGroupNames
                                    .map((group) => _buildCategoryChip(group)),
                              ],
                            ),
                          ),
                        Expanded(
                          child: tasks.isEmpty
                              ? Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        showRecommendations
                                            ? Icons.interests
                                            : Icons.search_off,
                                        size: 64,
                                        color: Colors.grey[400],
                                      ),
                                      const SizedBox(height: 16),
                                      Text(
                                        showRecommendations
                                            ? 'Укажите интересы, чтобы видеть рекомендации'
                                            : 'Нет заданий',
                                        style: const TextStyle(
                                            color: AppColors.textSecondary),
                                        textAlign: TextAlign.center,
                                      ),
                                      if (showRecommendations) ...[
                                        const SizedBox(height: 16),
                                        ElevatedButton(
                                          onPressed: _showInterestsDialog,
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor:
                                                AppColors.primary,
                                            foregroundColor: Colors.white,
                                          ),
                                          child: const Text('Выбрать интересы'),
                                        ),
                                      ],
                                    ],
                                  ),
                                )
                              : ListView.builder(
                                  padding: const EdgeInsets.all(16),
                                  itemCount: tasks.length,
                                  itemBuilder: (context, index) {
                                    final task = tasks[index];
                                    return _buildTaskCard(task);
                                  },
                                ),
                        ),
                      ],
                    )
                  : const SizedBox.shrink(),
      floatingActionButton: showMain
          ? FloatingActionButton.extended(
              onPressed: _showAddTaskDialog,
              backgroundColor: AppColors.primary,
              icon: const Icon(Icons.add, color: Colors.white),
              label: const Text('Создать задание',
                  style: TextStyle(color: Colors.white)),
            )
          : null,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        backgroundColor: AppColors.surface,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textSecondary,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Главная',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.chat),
            label: 'Чаты',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.recommend),
            label: 'Рекомендации',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Профиль',
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryChip(String category) {
    final isSelected = selectedCategory == category;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(category),
        selected: isSelected,
        onSelected: (selected) {
          if (selected) {
            setState(() {
              selectedCategory = category;
            });
          }
        },
        selectedColor: AppColors.primary.withValues(alpha: 0.3),
        backgroundColor: AppColors.surface,
        side: BorderSide(
          color: isSelected ? AppColors.primary : AppColors.divider,
          width: 1.5,
        ),
      ),
    );
  }

  Widget _buildTaskCard(Task task) {
    final user = _currentUser;
    final isMyTask = task.authorId == user?.uid;
    final totalResponses = task.responses.length;

    Response? acceptedResponse;
    if (isMyTask && task.responses.isNotEmpty) {
      acceptedResponse = task.responses.firstWhere(
        (r) => r.status == 'accepted',
        orElse: () => task.responses.first,
      );
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: AppColors.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: task.categories.map((cat) {
                return Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    cat,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: Text(
                    task.title,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                Text(
                  task.priceDisplay,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.accent,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              task.description,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.person,
                    size: 16, color: AppColors.textSecondary),
                const SizedBox(width: 4),
                Text(
                  task.author,
                  style: const TextStyle(
                      color: AppColors.textSecondary, fontSize: 12),
                ),
                const SizedBox(width: 16),
                const Icon(Icons.star, size: 16, color: AppColors.warning),
                const SizedBox(width: 4),
                Text(
                  task.rating.toString(),
                  style: const TextStyle(
                      color: AppColors.textSecondary, fontSize: 12),
                ),
                const SizedBox(width: 16),
                const Icon(Icons.timer,
                    size: 16, color: AppColors.textSecondary),
                const SizedBox(width: 4),
                Text(
                  task.deadline,
                  style: const TextStyle(
                      color: AppColors.textSecondary, fontSize: 12),
                ),
                if (isMyTask && totalResponses > 0) ...[
                  const SizedBox(width: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '$totalResponses',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: isMyTask ? null : () => _applyForTask(task),
                    style: ElevatedButton.styleFrom(
                      backgroundColor:
                          isMyTask ? AppColors.divider : AppColors.accent,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(isMyTask ? 'Моё задание' : 'Откликнуться'),
                  ),
                ),
                const SizedBox(width: 8),
                if (isMyTask && totalResponses > 0)
                  IconButton(
                    onPressed: () => _viewResponses(task),
                    icon: const Icon(Icons.people, color: AppColors.primary),
                    tooltip: 'Посмотреть отклики',
                  ),
                if (isMyTask && acceptedResponse != null)
                  IconButton(
                    tooltip: 'Чат с исполнителем',
                    onPressed: () => _openChatWithUser(
                      acceptedResponse!.executorId,
                      acceptedResponse.executorName,
                    ),
                    icon: const Icon(Icons.chat, color: AppColors.primary),
                  ),
                if (!isMyTask)
                  IconButton(
                    onPressed: () => _openChat(task),
                    icon: const Icon(Icons.chat, color: AppColors.primary),
                    tooltip: 'Написать автору',
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}