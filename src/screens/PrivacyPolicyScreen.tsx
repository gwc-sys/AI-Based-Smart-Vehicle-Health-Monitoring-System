import { useNavigation } from '@react-navigation/native';
import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface PrivacyPolicyScreenProps {
  onClose?: () => void;
  onAgree?: () => void;
}

const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({ onClose, onAgree }) => {
  const navigation = useNavigation<any>();

  const handleGoBack = (): void => {
    if (onClose) {
      onClose();
      return;
    }

    navigation.goBack();
  };

  const handleIAgree = (): void => {
    if (onAgree) {
      onAgree();
    }
    handleGoBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} accessibilityLabel="Go back">
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={styles.lastUpdated}>Last Updated: March 2026</Text>

          <Section
            title="1. Introduction"
            content={`Welcome to AI Vehicle Health Monitoring App ("we," "us," "our," or "Company"). We are committed to protecting your privacy and ensuring you have a positive experience on our platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and associated services.

Please read this Privacy Policy carefully. If you do not agree with our policies and practices, please do not use our application.`}
          />

          <Section
            title="2. Information We Collect"
            content={`We collect information in various ways:

A. Information You Provide Directly:
• Account Registration: Full name, email address, phone number, password, and vehicle details
• Profile Information: Vehicle make, model, year, VIN, license plate, and maintenance history
• Device Information: Device identifiers, push notification tokens
• Communication: Messages, feedback, and support inquiries

B. Information Collected Automatically:
• Usage Data: Pages visited, features accessed, time spent, and interaction patterns
• Location Data: GPS coordinates for vehicle tracking and route optimization (with your consent)
• Sensor Data: Real-time vehicle sensor data including engine health, battery status, tire pressure, temperature, and performance metrics
• Device Information: Device model, operating system, unique device ID, IP address
• Crash Reports: Diagnostic and error data from the application`}
          />

          <Section
            title="3. How We Use Your Information"
            content={`We use the collected information for:

• Providing and improving our services
• Processing transactions and sending confirmations
• Sending transactional and promotional communications
• Personalizing user experience based on preferences
• Monitoring vehicle health and performance
• Sending real-time alerts for critical vehicle issues
• Analyzing trends and conducting analytics
• Detecting and preventing fraudulent activities
• Complying with legal obligations
• Improving application security and performance
• Research and development of new features

All data processing is conducted in accordance with applicable data protection laws.`}
          />

          <Section
            title="4. Data Security"
            content={`We implement comprehensive security measures to protect your personal information:

• End-to-End Encryption: All sensitive data is encrypted both in transit (TLS/SSL) and at rest (AES-256)
• Secure Authentication: Multi-factor authentication and secure password hashing
• Access Controls: Role-based access control and principle of least privilege
• Regular Audits: Scheduled security assessments and penetration testing
• Data Encryption: Vehicle sensor data is encrypted before transmission and storage
• Secure Servers: Data stored on secure, ISO 27001 certified servers
• Employee Training: Regular security training for all staff members
• Incident Response: Rapid response protocol for any security breaches

However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your information.`}
          />

          <Section
            title="5. Information Sharing and Disclosure"
            content={`We may share your information with:

• Service Providers: Third-party services for payment processing, cloud storage, and analytics
• Legal Compliance: Law enforcement when required by law or court order
• Business Partners: Authorized partners for vehicle maintenance and repair services
• Automotive Manufacturers: Aggregated, anonymized data with vehicle manufacturers for improvement purposes
• Emergency Services: Location data in case of emergency vehicle features activation
• Your Consent: Any third-party when you provide explicit consent

We do NOT sell your personal information to external parties. We ensure all third parties maintain appropriate data security standards.`}
          />

          <Section
            title="6. Data Retention"
            content={`We retain your information for:

• Account Information: For the duration of your account and 30 days after termination
• Vehicle Sensor Data: 12 months of continuous history; older data is archived
• Location Data: 30 days (if location tracking is enabled)
• Backup Data: Up to 90 days in automated backups
• Legal Requirements: Longer periods if required by applicable laws

You can request deletion of your data at any time, subject to legal and contractual obligations.`}
          />

          <Section
            title="7. Your Privacy Rights"
            content={`You have the right to:

• Access: Request a copy of all personal information we hold about you
• Correction: Correct inaccurate or incomplete information
• Deletion: Request deletion of your personal data (right to be forgotten)
• Portability: Receive your data in a structured, commonly-used format
• Opt-Out: Decline marketing communications and non-essential data collection
• Withdraw Consent: Withdraw consent for specific data processing activities
• Lodge Complaints: File complaints with relevant data protection authorities

To exercise these rights, please contact us at privacy@vehiclehealth.com with your request details.`}
          />

          <Section
            title="8. Location Data and Vehicle Tracking"
            content={`Location and vehicle tracking features:

• Consent Required: Vehicle tracking requires explicit user consent
• Real-Time Tracking: Optional feature for vehicle location monitoring
• Geo-Fencing: Set safe zone alerts for your vehicle
• Trip History: 30-day history of vehicle locations and routes
• Privacy Controls: You can disable location tracking at any time
• Location Accuracy: GPS data accurate within 5-10 meters
• Data Protection: Location data is encrypted and stored securely

Location data is never shared with third parties without your explicit consent.`}
          />

          <Section
            title="9. Children's Privacy"
            content={`Our application is not intended for children under 13 years old. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will promptly delete such information and terminate the child's account.

For users between 13-18 years, parental consent is required.`}
          />

          <Section
            title="10. Third-Party Links and Services"
            content={`Our application may contain links to third-party websites and services. This Privacy Policy applies only to our application. We are not responsible for the privacy practices of third-party services. We encourage you to review the privacy policies of any third-party services before providing your information.`}
          />

          <Section
            title="11. International Data Transfer"
            content={`If you are located outside your region, please note that the information you provide may be transferred to, stored in, and processed in other countries. By using our application, you consent to such transfers. We ensure appropriate protections are in place for international data transfers in compliance with applicable laws.`}
          />

          <Section
            title="12. Updates to Privacy Policy"
            content={`We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of material changes by updating the "Last Updated" date and, where appropriate, by sending you an email notification. Your continued use of the application after such modifications constitutes your acceptance of the updated Privacy Policy.`}
          />

          <Section
            title="13. Contact Information"
            content={`If you have questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us:

Email: privacy@vehiclehealth.com
Address: AI Vehicle Health Monitoring Team
Support Portal: www.vehiclehealth.com/support
Phone: 1-800-VEHICLE-1 (1-800-834-2835)
Data Protection Officer: dpo@vehiclehealth.com

Response Time: We will respond to all requests within 30 days.`}
          />

          <Section
            title="14. Compliance"
            content={`This Privacy Policy is designed to comply with:

• GDPR (General Data Protection Regulation)
• CCPA (California Consumer Privacy Act)
• HIPAA (Health Insurance Portability and Accountability Act)
• Local data protection and privacy laws
• Industry-specific regulations for vehicle data

We regularly conduct compliance audits to ensure adherence to these regulations.`}
          />

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.agreeButton}
              onPress={handleIAgree}
              activeOpacity={0.8}
              accessibilityLabel="I agree to privacy policy"
              accessibilityHint="Accept privacy policy and return to registration"
            >
              <Text style={styles.agreeButtonText}>I Agree and Accept</Text>
            </TouchableOpacity>
            <Text style={styles.footerText}>
              By using our application, you acknowledge that you have read and understood this Privacy Policy.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Reusable Section Component
interface SectionProps {
  title: string;
  content: string;
}

const Section: React.FC<SectionProps> = ({ title, content }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionContent}>{content}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 10,
    lineHeight: 22,
  },
  sectionContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
  },
  agreeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  agreeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PrivacyPolicyScreen;
